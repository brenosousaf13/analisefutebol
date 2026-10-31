import axios, { type AxiosRequestConfig } from 'axios';
import { uniquePlayersById } from '../utils/uniquePlayers.ts';
import { hasConfirmedLineups, hasStartingEleven, isFixtureFinished, isFixtureLive, isFixtureStartingSoon, type LineupConfirmation } from '../utils/fixtureStatus';
import { createFootballRequestQueue } from './footballRequestQueue';
import type { ApiFootballResponse, ApiTeam, ApiPlayer, ApiFixture, ApiLineup, ApiCountry, ApiLeague, ApiSquadPlayer } from '../types/api-football';

const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

/** Ligas escolhidas para a agenda. Os IDs distinguem nomes iguais em países diferentes. */
const TODAY_LEAGUES = new Set<number>([
    39,  // Premier League — Inglaterra
    140, // La Liga — Espanha
    135, // Serie A — Itália
    78,  // Bundesliga — Alemanha
    61,  // Ligue 1 — França
    94,  // Primeira Liga — Portugal
    88,  // Eredivisie — Países Baixos
    71,  // Série A — Brasil
    72,  // Série B — Brasil
    75,  // Série C — Brasil
    144, // Pro League — Bélgica
    203, // Süper Lig — Turquia
    128, // Liga Profesional — Argentina
    307, // Saudi Pro League — Arábia Saudita
    253, // MLS — EUA/Canadá
    262, // Liga MX — México
    235, // Premier League — Rússia
    333, // Premier League — Ucrânia
    239, // Primera A — Colômbia
    265, // Primera División — Chile
    268, // Primera División — Uruguai
    242, // Serie A — Equador
    250, // Primera División — Paraguai (Apertura)
    252, // Primera División — Paraguai (Clausura)
    281, // Liga 1 — Peru
    218, // Bundesliga — Áustria
]);

// Invalida o cache anterior, que incluía todas as ligas da API.
const TODAY_CACHE_KEY = 'zona14_today_fixtures_v3';
// A cota gratuita é de 100 consultas por dia: atualiza rápido só quando algo está acontecendo.
const TODAY_ACTIVE_TTL_MS = 2 * 60 * 1000;
const TODAY_IDLE_TTL_MS = 15 * 60 * 1000;
const LINEUP_RECHECK_MS = 5 * 60 * 1000;
const LINEUP_CACHE_PREFIX = 'zona14_lineup_confirmation_v2_';
const LINEUP_DATA_PREFIX = 'zona14_lineup_data_v1_';
const CONFIRMED_TTL_MS = 24 * 60 * 60 * 1000;
interface LineupConsumer { signal?: AbortSignal; canRequest?: () => boolean }
const lineupRequests = new Map<number, { promise: Promise<ApiLineup[]>; consumers: Set<LineupConsumer> }>();
let todayRequest: { date: string; promise: Promise<ApiFixture[]> } | undefined;

function todayCacheTtl(fixtures: ApiFixture[]): number {
    const now = Date.now();
    const active = fixtures.some(f => isFixtureLive(f)
        || (!isFixtureFinished(f) && Math.abs(Date.parse(f.fixture.date) - now) <= 60 * 60 * 1000));
    return active ? TODAY_ACTIVE_TTL_MS : TODAY_IDLE_TTL_MS;
}

function lineupCacheTtl(status: LineupConfirmation): number {
    return status === 'confirmed' ? CONFIRMED_TTL_MS : LINEUP_RECHECK_MS;
}

const FIXTURE_CACHE_PREFIX = 'zona14_fixture_';
const FIXTURE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — placar de jogo encerrado nao muda

const apiTransport = axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
    }
});
const footballRequests = createFootballRequestQueue();
const apiClient = {
    get: <T>(path: string, config?: AxiosRequestConfig, isCancelled?: () => boolean) =>
        footballRequests.run(() => apiTransport.get<T>(path, config), isCancelled),
};

/** A agenda e o editor compartilham os mesmos dados e a mesma consulta em andamento. */
async function fetchLineups(fixtureId: number, signal?: AbortSignal, canRequest?: () => boolean): Promise<ApiLineup[]> {
    const consumer: LineupConsumer = { signal, canRequest };
    const isActive = (entry: LineupConsumer) => !entry.signal?.aborted && (entry.canRequest?.() ?? true);
    if (!isActive(consumer)) throw new DOMException('Consulta cancelada', 'AbortError');
    try {
        const cached = JSON.parse(localStorage.getItem(`${LINEUP_DATA_PREFIX}${fixtureId}`) ?? 'null') as
            { data: ApiLineup[]; ts: number } | null;
        if (cached && Array.isArray(cached.data)) {
            const complete = new Set(cached.data.filter(hasStartingEleven).map(lineup => lineup.team.id)).size >= 2;
            if (Date.now() - cached.ts < (complete ? CONFIRMED_TTL_MS : LINEUP_RECHECK_MS)) return cached.data;
        }
    } catch { /* cache inválido */ }
    const existing = lineupRequests.get(fixtureId);
    if (existing) {
        existing.consumers.add(consumer);
        return existing.promise;
    }
    const consumers = new Set([consumer]);
    const promise = (async () => {
        const response = await apiClient.get<ApiFootballResponse<ApiLineup>>('/fixtures/lineups', {
            params: { fixture: fixtureId }, timeout: 20000,
        }, () => ![...consumers].some(isActive));
        if (!Array.isArray(response.data.response)) throw new Error('Resposta de escalação inválida.');
        const data = response.data.response;
        try {
            localStorage.setItem(`${LINEUP_DATA_PREFIX}${fixtureId}`, JSON.stringify({ data, ts: Date.now() }));
        } catch { /* storage cheio */ }
        return data;
    })();
    lineupRequests.set(fixtureId, { promise, consumers });
    try { return await promise; } finally { lineupRequests.delete(fixtureId); }
}

export const apiFootballService = {
    /**
     * Search for players by name
     * Note: Requires at least 3 characters
     */
    async searchPlayers(name: string, league?: number, season?: number): Promise<ApiPlayer[]> {
        try {
            const params: any = { search: name };
            if (league) params.league = league;
            if (season) params.season = season;

            const response = await apiClient.get<ApiFootballResponse<ApiPlayer>>('/players', {
                params
            });
            return response.data.response;
        } catch (error) {
            console.error('Error searching players:', error);
            throw error;
        }
    },

    /**
     * Get fixtures (matches) for a specific date
     * Date format: YYYY-MM-DD
     */
    async getFixturesByDate(date: string): Promise<ApiFixture[]> {
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiFixture>>('/fixtures', {
                params: { date }
            });
            return response.data.response;
        } catch (error) {
            console.error('Error fetching fixtures:', error);
            throw error;
        }
    },

    /**
     * Jogos de hoje no fuso de Brasilia (UTC-3).
     *
     * Retorna todas as partidas das 25 ligas acompanhadas. Data e timezone
     * vão juntos para incluir jogos da noite que já caem no dia seguinte UTC.
     */
    async getTodayFixtures(): Promise<ApiFixture[]> {
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date()); // en-CA ja formata como YYYY-MM-DD

        const cacheKey = `${TODAY_CACHE_KEY}_${today}`;
        let stale: ApiFixture[] | undefined;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { data, ts } = JSON.parse(cached) as { data: ApiFixture[]; ts: number };
                if (Date.now() - ts < todayCacheTtl(data)) return data;
                stale = data;
            }
        } catch { /* cache invalido */ }

        if (todayRequest?.date === today) return todayRequest.promise;
        const promise = (async () => {
            const response = await apiClient.get<ApiFootballResponse<ApiFixture>>('/fixtures', {
                params: { date: today, timezone: 'America/Sao_Paulo' },
                timeout: 20000,
            });
            if (Object.keys(response.data.errors ?? {}).length > 0) {
                throw new Error('Não foi possível consultar a agenda.');
            }
            const sorted = (response.data.response ?? []).filter(f => TODAY_LEAGUES.has(f.league?.id)).sort(
                (a, b) => (a.fixture?.timestamp ?? 0) - (b.fixture?.timestamp ?? 0),
            );
            try {
                localStorage.setItem(cacheKey, JSON.stringify({ data: sorted, ts: Date.now() }));
            } catch { /* storage cheio */ }
            return sorted;
        })();
        // Se a API falhar ou a cota acabar, mantém a última lista do dia em vez de esvaziar a tela.
        const guarded = promise.catch(error => {
            if (stale) return stale;
            throw error;
        });
        todayRequest = { date: today, promise: guarded };
        try {
            return await guarded;
        } finally {
            if (todayRequest?.promise === guarded) todayRequest = undefined;
        }
    },

    /**
     * Consulta apenas jogos ainda não iniciados que começam na próxima hora.
     * A interface limita também aos cards visíveis. O endpoint de escalações
     * funciona também no plano gratuito, que não permite fixtures por ids.
     * Não reutiliza o cache de placar de 6h: escalações novas precisam aparecer.
     */
    async getLineupConfirmations(fixtures: ApiFixture[], signal?: AbortSignal): Promise<Map<number, LineupConfirmation>> {
        const result = new Map<number, LineupConfirmation>();
        const requests: Promise<void>[] = [];
        for (const fixture of new Map(fixtures.map(f => [f.fixture.id, f])).values()) {
            if (!isFixtureStartingSoon(fixture)) continue;
            const id = fixture.fixture.id;
            try {
                // Dados já carregados no editor prevalecem sobre a tag antiga.
                const saved = JSON.parse(localStorage.getItem(`${LINEUP_DATA_PREFIX}${id}`) ?? 'null') as
                    { data: ApiLineup[]; ts: number } | null;
                if (saved && Date.now() - saved.ts < CONFIRMED_TTL_MS
                    && hasConfirmedLineups({ ...fixture, lineups: saved.data })) {
                    result.set(id, 'confirmed');
                    continue;
                }
                // Preserva só confirmações da versão anterior, nunca seus erros ou negativos antigos.
                const previous = JSON.parse(localStorage.getItem(`zona14_lineup_confirmation_${id}`) ?? 'null') as
                    { status: string; ts: number } | null;
                if (previous?.status === 'confirmed' && Date.now() - previous.ts < CONFIRMED_TTL_MS) {
                    result.set(id, 'confirmed');
                    continue;
                }
                const cached = JSON.parse(localStorage.getItem(`${LINEUP_CACHE_PREFIX}${id}`) ?? 'null') as
                    { status: LineupConfirmation; ts: number } | null;
                const ttl = cached ? lineupCacheTtl(cached.status) : 0;
                if (cached && ['confirmed', 'unconfirmed'].includes(cached.status)
                    && Date.now() - cached.ts < ttl) {
                    result.set(id, cached.status);
                    continue;
                }
            } catch { /* cache indisponível */ }
            requests.push((async () => {
                try {
                    const lineups = await fetchLineups(id, signal, () => isFixtureStartingSoon(fixture));
                    if (signal?.aborted || !isFixtureStartingSoon(fixture)) return;
                    const status = hasConfirmedLineups({ ...fixture, lineups }) ? 'confirmed' : 'unconfirmed';
                    result.set(id, status);
                    try {
                        localStorage.setItem(`${LINEUP_CACHE_PREFIX}${id}`, JSON.stringify({ status, ts: Date.now() }));
                    } catch { /* storage cheio */ }
                } catch {
                    if (!signal?.aborted && isFixtureStartingSoon(fixture)) result.set(id, 'pending');
                }
            })());
        }
        await Promise.all(requests);
        return result;
    },

    /**
     * Busca varios jogos de uma vez pelos ids.
     *
     * Usada para preencher placar e campeonato das analises salvas sem gastar
     * uma requisicao por analise — a API aceita ids separados por hifen, ate 20
     * por chamada. Cacheado por 6h: placar de jogo passado nao muda.
     */
    async getFixturesByIds(ids: number[]): Promise<Map<number, ApiFixture>> {
        const result = new Map<number, ApiFixture>();
        const unique = [...new Set(ids.filter(Boolean))];
        if (unique.length === 0) return result;

        const pending: number[] = [];
        for (const id of unique) {
            try {
                const cached = localStorage.getItem(`${FIXTURE_CACHE_PREFIX}${id}`);
                if (cached) {
                    const { data, ts } = JSON.parse(cached) as { data: ApiFixture; ts: number };
                    if (Date.now() - ts < FIXTURE_TTL_MS) {
                        result.set(id, data);
                        continue;
                    }
                }
            } catch { /* cache invalido */ }
            pending.push(id);
        }

        // A API limita a 20 ids por chamada.
        for (let i = 0; i < pending.length; i += 20) {
            const batch = pending.slice(i, i + 20);
            try {
                const response = await apiClient.get<ApiFootballResponse<ApiFixture>>('/fixtures', {
                    params: { ids: batch.join('-') },
                });
                for (const fixture of response.data.response ?? []) {
                    const id = fixture.fixture?.id;
                    if (!id) continue;
                    result.set(id, fixture);
                    try {
                        localStorage.setItem(
                            `${FIXTURE_CACHE_PREFIX}${id}`,
                            JSON.stringify({ data: fixture, ts: Date.now() }),
                        );
                    } catch { /* storage cheio */ }
                }
            } catch (error) {
                console.error('Error fetching fixtures batch:', error);
                // Segue com o que ja tem: a Home usa o placar salvo como fallback.
            }
        }

        return result;
    },

    /**
     * Get fixture by ID
     */
    async getFixtureById(id: number): Promise<ApiFixture | null> {
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiFixture>>('/fixtures', {
                params: { id }
            });
            return response.data.response[0] || null;
        } catch (error) {
            console.error('Error fetching fixture:', error);
            throw error;
        }
    },

    /**
     * Get lineups for a fixture
     */
    async getLineups(fixtureId: number): Promise<ApiLineup[]> {
        return fetchLineups(fixtureId);
    },

    /**
     * Get list of countries
     */
    async getCountries(): Promise<ApiCountry[]> {
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiCountry>>('/countries');
            return response.data.response;
        } catch (error) {
            console.error('Error fetching countries:', error);
            throw error;
        }
    },

    /**
     * Get leagues for a country
     */
    async getLeagues(country: string): Promise<ApiLeague[]> {
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiLeague>>('/leagues', {
                params: { country, current: 'true' } // Fetch only current seasons for now
            });
            return response.data.response;
        } catch (error) {
            console.error('Error fetching leagues:', error);
            throw error;
        }
    },

    /**
     * Get teams for a league and season
     */
    async getTeams(leagueId: number, season: number): Promise<ApiTeam[]> {
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiTeam>>('/teams', {
                params: { league: leagueId, season: season }
            });
            return response.data.response;
        } catch (error) {
            console.error('Error fetching teams:', error);
            throw error;
        }
    },

    /**
     * Get full squad for a team
     */
    async getSquad(teamId: number): Promise<ApiSquadPlayer[]> {
        console.log(`[API] Getting squad for team ${teamId} (Strategy: Squad Endpoint -> Seasons 2026-2023)`);

        // 1. Try /players/squads Endpoint
        try {
            const response = await apiClient.get<ApiFootballResponse<{ players: ApiSquadPlayer[] }>>('/players/squads', {
                params: { team: teamId }
            });

            if (response.data.response && response.data.response.length > 0) {
                console.log(`[API] /players/squads success: ${response.data.response[0].players.length} players found.`);
                return uniquePlayersById(response.data.response[0].players);
            }
            console.warn(`[API] /players/squads returned empty for team ${teamId}.`);
        } catch (error) {
            console.warn(`[API] /players/squads failed for team ${teamId}.`, error);
        }

        // 2. Fallback: Try Seasons 2026 down to 2023
        const seasons = [2026, 2025, 2024, 2023];

        for (const season of seasons) {
            try {
                console.log(`[API] Fallback: Trying season ${season} for team ${teamId}...`);
                const players = await this.getPlayersByTeam(teamId, season);

                if (players.length > 0) {
                    console.log(`[API] Success: Found ${players.length} players in season ${season}.`);

                    // Map ApiPlayer to ApiSquadPlayer
                    return uniquePlayersById(players.map(p => ({
                        id: p.player.id,
                        name: p.player.name,
                        age: p.player.age,
                        number: p.statistics[0]?.games.number || null,
                        position: p.statistics[0]?.games.position || 'Unknown',
                        photo: p.player.photo
                    })));
                }
                console.warn(`[API] Season ${season} returned 0 players.`);
            } catch (err) {
                console.warn(`[API] Error fetching season ${season}:`, err);
            }
        }

        console.error(`[API] All fallback strategies failed for team ${teamId}. Returning empty squad.`);
        return [];
    },

    /**
     * Get ALL players by team and season (iterating through pages)
     */
    async getPlayersByTeam(teamId: number, season: number): Promise<ApiPlayer[]> {
        const players: ApiPlayer[] = [];
        let page = 1;
        let totalPages = 1;

        try {
            do {
                console.log(`[API] Fetching players team ${teamId}, season ${season}, page ${page}...`);
                const response = await apiClient.get<ApiFootballResponse<ApiPlayer>>('/players', {
                    params: {
                        team: teamId,
                        season: season,
                        page: page
                    }
                });

                if (response.data.response) {
                    players.push(...response.data.response);
                }

                // Safety check for paging (sometimes API returns weird paging)
                if (response.data.paging && response.data.paging.total) {
                    totalPages = response.data.paging.total;
                } else {
                    totalPages = 1;
                }

                page++;

            } while (page <= totalPages);

            console.log(`[API] Total players fetched for season ${season}: ${players.length}`);
            return players;

        } catch (error) {
            console.error(`[API] Error in getPlayersByTeam (Team: ${teamId}, Season: ${season}):`, error);
            // Return whatever we have so far
            if (players.length > 0) return players;
            return [];
        }
    },

    /**
     * Search teams by country and name
     */
    async searchTeams(country: string, search: string): Promise<ApiTeam[]> {
        console.log(`[API] Searching teams - Search: ${search} (Country filter applied client-side: ${country})`);
        try {
            // API Limitation: Cannot use 'country' and 'search' together.
            // We search by name and filter by country in the UI.
            const response = await apiClient.get<ApiFootballResponse<ApiTeam>>('/teams', {
                params: {
                    search
                }
            });
            console.log('[API] Search Response:', response.data);

            return response.data.response;
        } catch (error) {
            console.error('[API] Error searching teams:', error);
            throw error;
        }
    }
};
