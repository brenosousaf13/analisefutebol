import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';

const serviceUrl = new URL('../src/services/apiFootballService.ts', import.meta.url).href;
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (context.parentURL?.includes('/src/') && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
            return nextResolve(`${specifier}.ts`, context);
        }
        if (context.parentURL === serviceUrl && specifier === 'axios') return { url: 'test:coach-api', shortCircuit: true };
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url === 'test:coach-api') return {
            format: 'module', source: 'export default { create: () => ({ get: (...args) => globalThis.coachApi(...args) }) };', shortCircuit: true,
        };
        if (url === serviceUrl) return {
            format: 'module-typescript', source: readFileSync(new URL(url), 'utf8').replace('import.meta.env.VITE_API_FOOTBALL_KEY', '"test-key"'), shortCircuit: true,
        };
        return nextLoad(url, context);
    },
});
const { loadAnalysisCoaches, coachAtDate, teamIdFromLogo } = await import('../src/services/analysisCoaches.ts');
const { apiFootballService } = await import(serviceUrl);
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const reply = response => ({ data: { response, errors: [] }, headers: { 'x-ratelimit-limit': '10000', 'x-ratelimit-remaining': '10000' } });
const team = id => ({ name: `Equipe ${id}`, logo: `https://media.api-sports.io/football/teams/${id}.png` });
const coach = (id, name, start = '2024-01-01', end = null) => ({ name, career: [{ team: { id }, start, end }] });
beforeEach(() => storage.clear());

test('identifies teams from old API logos and selects the coach at the match date', () => {
    assert.equal(teamIdFromLogo(team(1).logo), 1);
    assert.equal(teamIdFromLogo('custom-logo.png'), undefined);
    const coaches = [coach(1, 'Atual', '2026-10-01'), coach(1, 'Anterior', '2024-01-01', '2026-09-30')];
    assert.equal(coachAtDate(coaches, 1, '2025-06-10'), 'Anterior');
    assert.equal(coachAtDate(coaches, 1, '2026-11-09'), 'Atual');
    assert.equal(coachAtDate(coaches, 1), 'Atual');
    assert.equal(coachAtDate(coaches, 2), undefined);
    // Algumas respostas reais mantem cargos antigos sem data final: vence o inicio mais recente.
    assert.equal(coachAtDate([coach(1, 'Antigo sem fim'), coach(1, 'Novo', '2026-09-01')], 1, '2026-11-09'), 'Novo');
});

test('manual match fetches both coaches without requesting lineups and reuses daily cache', async () => {
    const calls = [];
    globalThis.coachApi = async (path, { params }) => {
        calls.push([path, params]);
        assert.equal(path, '/coachs');
        return reply([coach(params.team, `Técnico ${params.team}`)]);
    };
    const input = { date: '2026-11-09', home: team(1), away: team(2) };
    assert.deepEqual(await loadAnalysisCoaches(input), { home: 'Técnico 1', away: 'Técnico 2' });
    await loadAnalysisCoaches(input);
    assert.equal(calls.length, 2);
});

test('partial lineup cannot put the away coach on both teams', async () => {
    const calls = [];
    globalThis.coachApi = async (path, { params }) => {
        calls.push(path);
        if (path === '/fixtures/lineups') return reply([{ team: { id: 2, name: 'Different API name' }, coach: { name: 'Visitante na partida' } }]);
        assert.equal(params.team, 1);
        return reply([coach(1, 'Mandante via equipe')]);
    };
    assert.deepEqual(await loadAnalysisCoaches({ fixtureId: 42, home: team(1), away: team(2) }), {
        home: 'Mandante via equipe', away: 'Visitante na partida',
    });
    assert.deepEqual(calls, ['/fixtures/lineups', '/coachs']);
});

test('lineup coaches take priority even if names differ or the API order is reversed', async () => {
    globalThis.coachApi = async path => {
        assert.equal(path, '/fixtures/lineups');
        return reply([2, 1].map(id => ({ team: { id, name: 'Other name' }, coach: { name: `Partida ${id}` } })));
    };
    assert.deepEqual(await loadAnalysisCoaches({ fixtureId: 43, home: team(1), away: team(2) }), { home: 'Partida 1', away: 'Partida 2' });
});

test('API failure for one side preserves the other side and is not cached as an empty success', async () => {
    globalThis.coachApi = async (_path, { params }) => params.team === 1
        ? { ...reply([]), data: { response: [], errors: { team: 'Unavailable team' } } }
        : reply([coach(2, 'Visitante')]);
    assert.deepEqual(await loadAnalysisCoaches({ home: team(1), away: team(2) }), { home: undefined, away: 'Visitante' });
    assert.equal(storage.has('zona14_team_coaches_v1_1'), false);
});

test('concurrent coach requests are shared', async () => {
    let calls = 0;
    globalThis.coachApi = async () => { calls++; return reply([coach(1, 'Nome')]); };
    await Promise.all([apiFootballService.getTeamCoaches(1), apiFootballService.getTeamCoaches(1)]);
    assert.equal(calls, 1);
});
