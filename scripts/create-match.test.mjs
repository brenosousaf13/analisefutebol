import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { normalizeTeamText, rankTeams, teamSearchAliases } from '../src/utils/teamSearch.ts';
import { squadToBench } from '../src/utils/squadToBench.ts';
import { TRACKED_LEAGUES, TRACKED_LEAGUE_IDS } from '../src/data/trackedLeagues.ts';
import { groupFixturesByLeague, leagueDisplayName } from '../src/utils/leagueDisplay.ts';

const serviceUrl = new URL('../src/services/apiFootballService.ts', import.meta.url).href;
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (context.parentURL?.includes('/src/') && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
            return nextResolve(`${specifier}.ts`, context);
        }
        if (context.parentURL === serviceUrl && specifier === 'axios') return { url: 'test:agenda-api', shortCircuit: true };
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url === 'test:agenda-api') {
            return { format: 'module', source: 'export default { create: () => ({ get: (...args) => globalThis.agendaApi(...args) }) };', shortCircuit: true };
        }
        if (url === serviceUrl) {
            return { format: 'module-typescript', source: readFileSync(new URL(url), 'utf8').replace('import.meta.env.VITE_API_FOOTBALL_KEY', '"test-key"'), shortCircuit: true };
        }
        return nextLoad(url, context);
    },
});
const { apiFootballService } = await import(serviceUrl);

const storage = new Map();
globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
};
const reply = response => ({ data: { response, errors: [] }, headers: { 'x-ratelimit-limit': '10000', 'x-ratelimit-remaining': '10000' } });
const apiTeam = (id, name, country = 'Brazil', national = false) => ({ team: { id, name, country, national, logo: `logo/${id}.png` }, venue: {} });

// A busca guarda resultados em memória entre testes: cada teste usa termos próprios.
beforeEach(() => {
    storage.clear();
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-09T15:00:00Z') });
});
afterEach(() => mock.timers.reset());

test('the tracked competitions are exactly the 41 ids of the spreadsheet, without duplicates', () => {
    const expected = [71, 72, 73, 13, 11, 541, 2, 3, 848, 531, 15, 39, 45, 48, 140, 143, 135, 137, 78, 81, 61, 66, 128, 130,
        1, 34, 32, 29, 30, 31, 33, 37, 10, 4, 5, 9, 22, 6, 7, 806, 913];
    assert.equal(TRACKED_LEAGUES.length, expected.length);
    assert.equal(TRACKED_LEAGUE_IDS.size, expected.length);
    assert.deepEqual([...TRACKED_LEAGUE_IDS].sort((a, b) => a - b), [...expected].sort((a, b) => a - b));
    assert.ok(TRACKED_LEAGUES.every(league => league.name && league.group));
});

test('Brazilian competitions come first on the home and use Portuguese names', () => {
    const fx = (id, league, country, ts) => ({
        fixture: { id, timestamp: ts, status: { short: 'NS' } },
        league: { id: league, name: 'API name', country, round: 'Regular Season - 1' },
        teams: { home: { id, name: 'A' }, away: { id: id + 1, name: 'B' } },
    });
    const groups = groupFixturesByLeague([fx(1, 2, 'World', 1), fx(2, 39, 'England', 2), fx(3, 71, 'Brazil', 3), fx(4, 73, 'Brazil', 4), fx(5, 999, 'Peru', 0)]);
    assert.deepEqual(groups.map(g => g.leagueId), [71, 73, 2, 39, 999]);
    assert.equal(groups[0].name, 'Brasileirão Série A');
    assert.equal(leagueDisplayName({ id: 999, name: 'Liga 1' }), 'Liga 1');
});

test('normalizes team text and maps Portuguese country names to the API names', () => {
    assert.equal(normalizeTeamText('  Atlético-MG  '), 'atletico mg');
    assert.equal(normalizeTeamText('São Paulo'), 'sao paulo');
    assert.deepEqual(teamSearchAliases('brasil'), ['brazil']);
    assert.deepEqual(teamSearchAliases('alemanha'), ['germany']);
    assert.deepEqual(teamSearchAliases('flamengo'), []);
    const ranked = rankTeams([
        { id: 1, name: 'Westchester Flames' }, { id: 2, name: 'Flamengo W' }, { id: 3, name: 'Flamengo' },
    ], 'flam');
    assert.deepEqual(ranked.map(t => t.id), [3, 2, 1]);
    // time principal do Brasil antes de categorias de base e de homônimos de outros países
    const vasco = rankTeams([
        { id: 1, name: 'Vasco U17', country: 'Brazil' }, { id: 2, name: 'Vasco da Gama', country: 'South-Africa' },
        { id: 3, name: 'Vasco da Gama', country: 'Brazil' }, { id: 4, name: 'Vasco da Gama W', country: 'Brazil' },
    ], 'vasco');
    assert.deepEqual(vasco.map(t => t.id), [3, 2, 1, 4]);
});

test('lists the whole squad as bench, goalkeepers first, and nobody on the field', () => {
    const bench = squadToBench([
        { id: 9, name: 'Atacante', number: 9, position: 'Attacker' },
        { id: 5, name: 'Meia', number: 8, position: 'Midfielder' },
        { id: 1, name: 'Goleiro', number: 1, position: 'Goalkeeper' },
        { id: 0, name: 'Sem id', number: null, position: 'Defender' },
        { id: 3, name: 'Zagueiro', number: 3, position: 'Defender' },
    ], false);
    assert.deepEqual(bench.map(p => p.name), ['Goleiro', 'Zagueiro', 'Sem id', 'Meia', 'Atacante']);
    assert.ok(bench.every(p => p.isStarter === false && p.position.x === 50 && p.position.y === 50));
    assert.equal(bench.find(p => p.name === 'Sem id').id, 2102);
    assert.equal(bench.find(p => p.name === 'Sem id').number, 0);
});

test('team search needs 3 letters, filters by name, and one request serves every longer term', async () => {
    const calls = [];
    globalThis.agendaApi = async (path, { params }) => {
        calls.push(`${path}?${params.search}`);
        return reply([
            apiTeam(1, 'Zorrilla FC'), apiTeam(2, 'Zorrilla W'), apiTeam(3, 'Real Zorr'), apiTeam(4, 'Outro Time', 'Zorrilland'),
        ]);
    };
    assert.deepEqual(await apiFootballService.searchTeamOptions('zo'), []);
    assert.equal(calls.length, 0);
    const first = await apiFootballService.searchTeamOptions('Zor');
    assert.deepEqual(first.map(t => t.id).sort(), [1, 2, 3]); // o time que só casa pelo país ("Outro Time") não conta
    assert.equal(calls.length, 1);
    // termos mais longos reutilizam a resposta: nenhuma consulta nova
    assert.deepEqual((await apiFootballService.searchTeamOptions('zorrilla')).map(t => t.id).sort(), [1, 2]);
    assert.deepEqual((await apiFootballService.searchTeamOptions('Zorrilla w')).map(t => t.id), [2]);
    assert.equal(calls.length, 1);
    // repetir o mesmo termo, mesmo depois de recarregar a página (cache em disco), não consulta
    assert.equal((await apiFootballService.searchTeamOptions('zor')).length, 3);
    assert.equal(calls.length, 1);
});

test('searching a country in Portuguese also searches the English name, and caches both', async () => {
    const calls = [];
    globalThis.agendaApi = async (_, { params }) => {
        calls.push(params.search);
        return reply(params.search === 'brazil' ? [apiTeam(10, 'Brazil', 'Brazil', true)] : [apiTeam(11, 'Brasil de Pelotas')]);
    };
    const result = await apiFootballService.searchTeamOptions('Brasil');
    assert.deepEqual(calls.sort(), ['brasil', 'brazil']);
    assert.deepEqual(result.map(t => t.name).sort(), ['Brasil de Pelotas', 'Brazil']);
    assert.equal(result.find(t => t.name === 'Brazil').national, true);
    await apiFootballService.searchTeamOptions('brasil');
    assert.equal(calls.length, 2);
});

test('a failed team search is not cached', async () => {
    let calls = 0;
    globalThis.agendaApi = async () => { calls++; if (calls === 1) throw new Error('offline'); return reply([apiTeam(20, 'Quimera FC')]); };
    await assert.rejects(apiFootballService.searchTeamOptions('quimera'));
    assert.equal((await apiFootballService.searchTeamOptions('quimera')).length, 1);
    assert.equal(calls, 2);
});

test('squads are cached for a day, so creating the same match again costs no request', async () => {
    let calls = 0;
    globalThis.agendaApi = async (path, { params }) => {
        calls++;
        assert.equal(path, '/players/squads');
        return reply([{ players: [{ id: params.team * 10, name: 'Jogador', number: 9, position: 'Attacker' }] }]);
    };
    assert.equal((await apiFootballService.getSquad(501)).length, 1);
    assert.equal((await apiFootballService.getSquad(501)).length, 1);
    assert.equal(calls, 1);
    mock.timers.tick(25 * 60 * 60 * 1000);
    await apiFootballService.getSquad(501);
    assert.equal(calls, 2);
});
