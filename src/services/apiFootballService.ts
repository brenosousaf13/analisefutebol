import axios from 'axios';
import { uniquePlayersById } from '../utils/uniquePlayers.ts';
import { hasConfirmedLineups, isFixtureFinished, type LineupConfirmation } from '../utils/fixtureStatus';
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
const TODAY_TTL_MS = 60 * 1000;
const LINEUP_CACHE_PREFIX = 'zona14_lineup_confirmation_';
const lineupRequests = new Map<number, Promise<Map<number, LineupConfirmation>>>();
let todayRequest: { date: string; promise: Promise<ApiFixture[]> } | undefined;

function lineupCacheTtl(fixture: ApiFixture, status: LineupConfirmation): number {
    if (status === 'confirmed') return 24 * 60 * 60 * 1000;
    if (status === 'unavailable') return 5 * 60 * 1000;
    if (isFixtureFinished(fixture) || ['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(fixture.fixture.status.short)) {
        return 6 * 60 * 60 * 1000;
    }
    const untilLineupWindow = Date.parse(fixture.fixture.date) - Date.now() - 2 * 60 * 60 * 1000;
    return untilLineupWindow > 0 ? Math.min(30 * 60 * 1000, untilLineupWindow) : TODAY_TTL_MS;
}

const FIXTURE_CACHE_PREFIX = 'zona14_fixture_';
const FIXTURE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — placar de jogo encerrado nao muda

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
    }
});

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
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { data, ts } = JSON.parse(cached) as { data: ApiFixture[]; ts: number };
                if (Date.now() - ts < TODAY_TTL_MS) return data;
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
        todayRequest = { date: today, promise };
        try {
            return await promise;
        } finally {
            if (todayRequest?.promise === promise) todayRequest = undefined;
        }
    },

    /**
     * Consulta só os cards próximos à área visível. O endpoint de escalações
     * funciona também no plano gratuito, que não permite fixtures por ids.
     * Não reutiliza o cache de placar de 6h: escalações novas precisam aparecer.
     */
    async getLineupConfirmations(fixtures: ApiFixture[]): Promise<Map<number, LineupConfirmation>> {
        const result = new Map<number, LineupConfirmation>();
        const pending: ApiFixture[] = [];
        const requests = new Set<Promise<Map<number, LineupConfirmation>>>();
        for (const fixture of new Map(fixtures.map(f => [f.fixture.id, f])).values()) {
            const id = fixture.fixture.id;
            try {
                const cached = JSON.parse(localStorage.getItem(`${LINEUP_CACHE_PREFIX}${id}`) ?? 'null') as
                    { status: LineupConfirmation; ts: number } | null;
                const ttl = cached ? lineupCacheTtl(fixture, cached.status) : 0;
                if (cached && ['confirmed', 'unconfirmed', 'unavailable'].includes(cached.status)
                    && Date.now() - cached.ts < ttl) {
                    result.set(id, cached.status);
                    continue;
                }
            } catch { /* cache indisponível */ }
            const request = lineupRequests.get(id);
            if (request) requests.add(request);
            else pending.push(fixture);
        }
        for (const fixture of pending) {
            const id = fixture.fixture.id;
            const request = (async () => {
                const statuses = new Map<number, LineupConfirmation>();
                let status: LineupConfirmation;
                try {
                    const response = await apiClient.get<ApiFootballResponse<ApiLineup>>('/fixtures/lineups', {
                        params: { fixture: id },
                        timeout: 20000,
                    });
                    if (Object.keys(response.data.errors ?? {}).length > 0) throw new Error('Lineups unavailable');
                    status = hasConfirmedLineups({ ...fixture, lineups: response.data.response }) ? 'confirmed' : 'unconfirmed';
                } catch {
                    status = 'unavailable';
                }
                statuses.set(id, status);
                try {
                    localStorage.setItem(`${LINEUP_CACHE_PREFIX}${id}`, JSON.stringify({ status, ts: Date.now() }));
                } catch { /* storage cheio */ }
                return statuses;
            })();
            lineupRequests.set(id, request);
            requests.add(request);
            void request.finally(() => { lineupRequests.delete(id); });
        }
        for (const statuses of await Promise.all(requests)) {
            for (const [id, status] of statuses) result.set(id, status);
        }
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
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiLineup>>('/fixtures/lineups', {
                params: { fixture: fixtureId }
            });
            return response.data.response;
        } catch (error) {
            console.error('Error fetching lineups:', error);
            throw error;
        }
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
