import axios, { type AxiosRequestConfig } from 'axios';
import { uniquePlayersById } from '../utils/uniquePlayers.ts';
import { hasConfirmedLineups, hasStartingEleven, isFixtureFinished, isFixtureLive, isFixtureSettled, isFixtureStartingSoon, type LineupConfirmation } from '../utils/fixtureStatus';
import { todayInBrasilia } from '../utils/agendaDates';
import { normalizeTeamText, rankTeams, teamNameMatches, teamSearchAliases } from '../utils/teamSearch';
import { isTrackedFixture } from '../utils/trackedFixtures';
import type { TeamOption } from '../types/teamOption';
import { createFootballRequestQueue, FootballPlanError, planWindowError } from './footballRequestQueue';
import type { ApiFootballResponse, ApiTeam, ApiPlayer, ApiFixture, ApiLineup, ApiCountry, ApiLeague, ApiSquadPlayer } from '../types/api-football';

const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

// Cada dia consultado guarda a resposta COMPLETA da API (todas as ligas). A agenda filtra
// pelas ligas acompanhadas e o "Criar partida" usa o resto — uma consulta serve às duas telas.
const DAY_CACHE_PREFIX = 'zona14_agenda_fixtures_v4_';
const LEGACY_DAY_CACHE_PREFIX = 'zona14_today_fixtures_v';
const DAY_CACHE_MAX_ENTRIES = 6;
const FUTURE_DAY_TTL_MS = 60 * 60 * 1000;
const PAST_DAY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // placar de dia encerrado não muda
const PAST_UNSETTLED_TTL_MS = 15 * 60 * 1000;
// Intervalo de datas que o plano da API libera, aprendido do primeiro erro de plano do dia.
const PLAN_WINDOW_KEY = 'zona14_football_plan_window_v1';
// A cota gratuita é de 100 consultas por dia: atualiza rápido só quando algo está acontecendo.
const TODAY_ACTIVE_TTL_MS = 2 * 60 * 1000;
const TODAY_IDLE_TTL_MS = 15 * 60 * 1000;
const LINEUP_RECHECK_MS = 5 * 60 * 1000;
const LINEUP_CACHE_PREFIX = 'zona14_lineup_confirmation_v2_';
const LINEUP_DATA_PREFIX = 'zona14_lineup_data_v1_';
const CONFIRMED_TTL_MS = 24 * 60 * 60 * 1000;
interface LineupConsumer { signal?: AbortSignal; canRequest?: () => boolean }
const lineupRequests = new Map<number, { promise: Promise<ApiLineup[]>; consumers: Set<LineupConsumer> }>();
const dayRequests = new Map<string, Promise<ApiFixture[]>>();

// Busca de times ("Criar partida") e elencos: mudam pouco, então ficam guardados por muito tempo.
const TEAM_SEARCH_PREFIX = 'zona14_team_search_v2_';
const TEAM_SEARCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SQUAD_CACHE_PREFIX = 'zona14_squad_v1_';
const SQUAD_TTL_MS = 24 * 60 * 60 * 1000;
const SQUAD_CACHE_MAX_ENTRIES = 30;
const teamSearchMemory = new Map<string, TeamOption[]>();
const teamSearchRequests = new Map<string, Promise<TeamOption[]>>();

function todayCacheTtl(fixtures: ApiFixture[]): number {
    const now = Date.now();
    const active = fixtures.some(f => isFixtureLive(f)
        || (!isFixtureFinished(f) && Math.abs(Date.parse(f.fixture.date) - now) <= 60 * 60 * 1000));
    return active ? TODAY_ACTIVE_TTL_MS : TODAY_IDLE_TTL_MS;
}

const isTrackedLeague = isTrackedFixture;

function dayCacheTtl(date: string, today: string, all: ApiFixture[]): number {
    if (date === today) return todayCacheTtl(all.filter(isTrackedLeague));
    if (date > today) return FUTURE_DAY_TTL_MS;
    return all.every(isFixtureSettled) ? PAST_DAY_TTL_MS : PAST_UNSETTLED_TTL_MS;
}

/** Mantém só os dias mais próximos de hoje e apaga o cache antigo, que ocupava espaço à toa. */
function pruneDayCache(today: string, keep: number) {
    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) keys.push(key);
        }
        for (const key of keys) if (key.startsWith(LEGACY_DAY_CACHE_PREFIX)) localStorage.removeItem(key);
        const distance = (key: string) => Math.abs(Date.parse(key.slice(DAY_CACHE_PREFIX.length)) - Date.parse(today));
        const days = keys.filter(key => key.startsWith(DAY_CACHE_PREFIX)).sort((a, b) => distance(a) - distance(b));
        for (const key of days.slice(keep)) localStorage.removeItem(key);
    } catch { /* storage indisponível */ }
}

interface PlanWindow { from: string; to: string; day: string }

function readPlanWindow(today: string): PlanWindow | null {
    try {
        const saved = JSON.parse(localStorage.getItem(PLAN_WINDOW_KEY) ?? 'null') as PlanWindow | null;
        return saved && saved.day === today && typeof saved.from === 'string' && typeof saved.to === 'string' ? saved : null;
    } catch { return null; }
}

function savePlanWindow(error: FootballPlanError, today: string) {
    if (!error.from || !error.to) return;
    try { localStorage.setItem(PLAN_WINDOW_KEY, JSON.stringify({ from: error.from, to: error.to, day: today })); } catch { /* storage cheio */ }
}

/**
 * Todas as partidas de um dia (todas as ligas), com o mínimo de consultas:
 * cache por dia, consulta única em andamento e, se o plano já mostrou que a data
 * está fora do que libera, nem chega a consultar de novo.
 */
async function loadDay(date: string): Promise<ApiFixture[]> {
    const today = todayInBrasilia();
    const cacheKey = `${DAY_CACHE_PREFIX}${date}`;
    let stale: ApiFixture[] | undefined;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { data, ts } = JSON.parse(cached) as { data: ApiFixture[]; ts: number };
            if (Date.now() - ts < dayCacheTtl(date, today, data)) return data;
            stale = data;
        }
    } catch { /* cache invalido */ }

    // Hoje nunca é barrado de antemão: perto da meia-noite a "data da API" (UTC) pode divergir da de Brasília.
    const planWindow = date === today ? null : readPlanWindow(today);
    if (planWindow && (date < planWindow.from || date > planWindow.to)) {
        if (stale) return stale;
        throw planWindowError(planWindow.from, planWindow.to);
    }

    const running = dayRequests.get(date);
    if (running) return running;
    const promise = (async () => {
        const response = await apiClient.get<ApiFootballResponse<ApiFixture>>('/fixtures', {
            params: { date, timezone: 'America/Sao_Paulo' },
            timeout: 20000,
        });
        if (Object.keys(response.data.errors ?? {}).length > 0) {
            throw new Error('Não foi possível consultar a agenda.');
        }
        const sorted = [...(response.data.response ?? [])].sort(
            (a, b) => (a.fixture?.timestamp ?? 0) - (b.fixture?.timestamp ?? 0),
        );
        const entry = JSON.stringify({ data: sorted, ts: Date.now() });
        try {
            localStorage.setItem(cacheKey, entry);
            pruneDayCache(today, DAY_CACHE_MAX_ENTRIES);
        } catch {
            // Sem espaço: libera os dias mais distantes e tenta mais uma vez.
            pruneDayCache(today, 1);
            try { localStorage.setItem(cacheKey, entry); } catch { /* segue sem cache */ }
        }
        return sorted;
    })();
    // Se a API falhar ou a cota acabar, mantém a última lista do dia em vez de esvaziar a tela.
    const guarded = promise.catch(error => {
        if (error instanceof FootballPlanError) savePlanWindow(error, today);
        if (stale) return stale;
        throw error;
    });
    dayRequests.set(date, guarded);
    try {
        return await guarded;
    } finally {
        if (dayRequests.get(date) === guarded) dayRequests.delete(date);
    }
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

function pruneSquadCache() {
    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(SQUAD_CACHE_PREFIX)) keys.push(key);
        }
        if (keys.length <= SQUAD_CACHE_MAX_ENTRIES) return;
        const stamped = keys.map(key => {
            try { return { key, ts: (JSON.parse(localStorage.getItem(key) ?? 'null') as { ts: number } | null)?.ts ?? 0 }; }
            catch { return { key, ts: 0 }; }
        }).sort((a, b) => a.ts - b.ts);
        for (const { key } of stamped.slice(0, keys.length - SQUAD_CACHE_MAX_ENTRIES)) localStorage.removeItem(key);
    } catch { /* storage indisponível */ }
}

/** Times de um termo mais curto, já pesquisado, que contêm todos os deste (ou undefined). */
function coveredByShorterTerm(term: string, remember = true): TeamOption[] | undefined {
    for (const [shorter, teams] of teamSearchMemory) {
        if (shorter.length >= 3 && shorter !== term && term.startsWith(shorter)) {
            const subset = teams.filter(team => teamNameMatches(team, term));
            if (remember) teamSearchMemory.set(term, subset);
            return subset;
        }
    }
    return undefined;
}

/** Resultado de um termo já normalizado: memória → cache → termo mais curto já pesquisado → API. */
async function searchTeamsByTerm(term: string, signal?: AbortSignal): Promise<TeamOption[]> {
    const memory = teamSearchMemory.get(term);
    if (memory) return memory;

    const key = `${TEAM_SEARCH_PREFIX}${term}`;
    try {
        const cached = JSON.parse(localStorage.getItem(key) ?? 'null') as { data: TeamOption[]; ts: number } | null;
        if (cached && Array.isArray(cached.data) && Date.now() - cached.ts < TEAM_SEARCH_TTL_MS) {
            teamSearchMemory.set(term, cached.data);
            return cached.data;
        }
    } catch { /* cache inválido */ }

    const covered = coveredByShorterTerm(term);
    if (covered) return covered;

    const running = teamSearchRequests.get(term);
    if (running) return running;
    const promise = (async () => {
        let response;
        try {
            // Se enquanto esperava na fila chegou o resultado de um termo mais curto, nem consulta.
            response = await apiClient.get<ApiFootballResponse<ApiTeam>>('/teams', {
                params: { search: term }, timeout: 20000,
            }, () => !!signal?.aborted || coveredByShorterTerm(term, false) !== undefined);
        } catch (error) {
            const covered = coveredByShorterTerm(term);
            if (covered && !signal?.aborted) return covered;
            throw error;
        }
        const teams: TeamOption[] = (response.data.response ?? [])
            .map(({ team }) => ({ id: team.id, name: team.name, country: team.country, national: !!team.national, logo: team.logo }))
            .filter(team => teamNameMatches(team, term));
        teamSearchMemory.set(term, teams);
        try { localStorage.setItem(key, JSON.stringify({ data: teams, ts: Date.now() })); } catch { /* storage cheio */ }
        return teams;
    })();
    teamSearchRequests.set(term, promise);
    try { return await promise; } finally { teamSearchRequests.delete(term); }
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
     * Partidas de um dia no fuso de Brasília (UTC-3), em ordem de horário.
     *
     * `tracked` devolve só as ligas escolhidas para a agenda; `all` devolve todas
     * (usado na busca de "Criar partida"). As duas leituras vêm da mesma consulta.
     * Data e timezone vão juntos para incluir jogos da noite que já caem no dia
     * seguinte em UTC.
     */
    async getDayFixtures(date: string, scope: 'tracked' | 'all' = 'tracked'): Promise<ApiFixture[]> {
        const all = await loadDay(date);
        return scope === 'all' ? all : all.filter(isTrackedLeague);
    },

    /** Esquece o intervalo de datas do plano (útil depois de trocar de plano). */
    forgetPlanWindow() {
        try { localStorage.setItem(PLAN_WINDOW_KEY, 'null'); } catch { /* storage indisponível */ }
    },

    /** Jogos de hoje nas ligas acompanhadas. */
    async getTodayFixtures(): Promise<ApiFixture[]> {
        return apiFootballService.getDayFixtures(todayInBrasilia());
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
        const cacheKey = `${SQUAD_CACHE_PREFIX}${teamId}`;
        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey) ?? 'null') as { data: ApiSquadPlayer[]; ts: number } | null;
            if (cached && Array.isArray(cached.data) && cached.data.length > 0 && Date.now() - cached.ts < SQUAD_TTL_MS) {
                return cached.data;
            }
        } catch { /* cache inválido */ }

        const squad = await apiFootballService.getSquadUncached(teamId);
        if (squad.length > 0) {
            try {
                localStorage.setItem(cacheKey, JSON.stringify({ data: squad, ts: Date.now() }));
                pruneSquadCache();
            } catch { /* storage cheio */ }
        }
        return squad;
    },

    async getSquadUncached(teamId: number): Promise<ApiSquadPlayer[]> {
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
     * Busca times pelo nome (mínimo 3 letras) para o "Criar partida".
     *
     * Poucas consultas: o resultado de um termo serve a todo termo mais longo que o contenha
     * ("fla" já responde "flamen"), então só as 3 primeiras letras custam uma consulta. Cada
     * termo fica guardado por 7 dias. A API também procura pelo país; aqui só contam times
     * cujo NOME contém o termo. Escrever "Brasil" procura também por "Brazil".
     */
    async searchTeamOptions(term: string, signal?: AbortSignal): Promise<TeamOption[]> {
        const needle = normalizeTeamText(term);
        if (needle.length < 3) return [];
        const terms = [needle, ...teamSearchAliases(needle)];
        const lists = await Promise.all(terms.map(item => searchTeamsByTerm(item, signal)));
        const unique = new Map<number, TeamOption>();
        for (const team of lists.flat()) unique.set(team.id, team);
        return rankTeams([...unique.values()], needle);
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
