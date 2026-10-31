import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { fixtureTimeLabel, hasConfirmedLineups, isFixtureFinished, isFixtureLive } from '../src/utils/fixtureStatus.ts';

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
const reply = (response, errors = []) => ({ data: { response, errors } });
const fixture = (id, status = 'NS', date = '2026-10-31T23:30:00-03:00', league = 39) => ({
    fixture: { id, date, timestamp: Date.parse(date) / 1000, status: { short: status } },
    league: { id: league, name: `Liga ${league}` },
    teams: { home: { id: id * 2 }, away: { id: id * 2 + 1 } },
    goals: { home: 2, away: 1 },
});
const lineup = teamId => ({ team: { id: teamId }, startXI: Array.from({ length: 11 }, (_, id) => ({ player: { id: id + 1 } })) });
const confirmed = f => ({ ...f, lineups: [lineup(f.teams.home.id), lineup(f.teams.away.id)] });
beforeEach(() => {
    storage.clear();
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-01T01:00:00Z') });
});
afterEach(() => mock.timers.reset());

test('restricts leagues, sorts by kickoff, includes late Brasília games, and ignores the previous unrestricted cache', async () => {
    storage.set('zona14_today_fixtures_v2_2026-10-31', JSON.stringify({ data: [fixture(4, 'NS', undefined, 999)], ts: Date.now() }));
    const all = [
        fixture(1, 'NS', '2026-10-31T23:30:00-03:00', 71),
        fixture(2, 'FT', '2026-10-31T09:00:00-03:00', 140),
        fixture(3, 'NS', '2026-10-31T20:00:00-03:00', 39),
        fixture(4, 'NS', '2026-10-31T11:00:00-03:00', 999),
        fixture(5, 'NS', '2026-10-31T08:00:00-03:00', 73),
        fixture(6, 'NS', '2026-10-31T22:00:00-03:00', 2),
    ];
    let calls = 0;
    globalThis.agendaApi = async (path, { params }) => {
        calls++;
        assert.equal(path, '/fixtures');
        assert.deepEqual(params, { date: '2026-10-31', timezone: 'America/Sao_Paulo' });
        return reply(all);
    };
    assert.deepEqual((await apiFootballService.getTodayFixtures()).map(f => f.fixture.id), [2, 3, 1]);
    await apiFootballService.getTodayFixtures();
    assert.equal(calls, 1);
    mock.timers.tick(60001);
    await apiFootballService.getTodayFixtures();
    assert.equal(calls, 2);
});

test('includes the 25 requested leagues, with both Paraguay phases and country-specific ids', async () => {
    const ids = [39, 140, 135, 78, 61, 94, 88, 71, 72, 75, 144, 203, 128, 307, 253, 262, 235, 333, 239, 265, 268, 242, 250, 252, 281, 218];
    const allowed = ids.map((id, i) => fixture(i + 1, 'NS', undefined, id));
    const excluded = [40, 73, 76, 145, 204, 129, 308, 254, 263, 236, 334, 240, 266, 269, 243, 251, 282, 219];
    globalThis.agendaApi = async () => reply([...allowed, ...excluded.map((id, i) => fixture(i + 100, 'NS', undefined, id))]);
    assert.deepEqual((await apiFootballService.getTodayFixtures()).map(f => f.league.id), ids);
});

test('returns no games when only unlisted leagues have matches, without falling back to all leagues', async () => {
    globalThis.agendaApi = async () => reply([fixture(1, 'NS', undefined, 73), fixture(2, 'FT', undefined, 2)]);
    assert.deepEqual(await apiFootballService.getTodayFixtures(), []);
});

test('rolls the agenda date over at midnight in Brasília', async () => {
    const dates = [];
    globalThis.agendaApi = async (_, { params }) => { dates.push(params.date); return reply([]); };
    await apiFootballService.getTodayFixtures();
    mock.timers.tick(2 * 60 * 60 * 1000);
    await apiFootballService.getTodayFixtures();
    assert.deepEqual(dates, ['2026-10-31', '2026-11-01']);
});

test('deduplicates concurrent agenda reads', async () => {
    let resolve, calls = 0;
    globalThis.agendaApi = () => { calls++; return new Promise(r => { resolve = r; }); };
    const first = apiFootballService.getTodayFixtures();
    const second = apiFootballService.getTodayFixtures();
    resolve(reply([fixture(1)]));
    await Promise.all([first, second]);
    assert.equal(calls, 1);
});

test('does not turn network failures or API quota errors into an empty successful agenda', async () => {
    globalThis.agendaApi = async () => reply([], { requests: 'Quota exceeded' });
    await assert.rejects(apiFootballService.getTodayFixtures());
    globalThis.agendaApi = async () => { throw new Error('offline'); };
    await assert.rejects(apiFootballService.getTodayFixtures());
    globalThis.agendaApi = async () => reply([]);
    assert.deepEqual(await apiFootballService.getTodayFixtures(), []);
});

test('only confirms two complete starting elevens for the matching teams', () => {
    const f = fixture(1);
    assert.equal(hasConfirmedLineups(f), false);
    assert.equal(hasConfirmedLineups(confirmed(f)), true);
    assert.equal(hasConfirmedLineups({ ...f, lineups: [lineup(2)] }), false);
    assert.equal(hasConfirmedLineups({ ...f, lineups: [lineup(2), lineup(999)] }), false);
    const partial = confirmed(f);
    partial.lineups[1].startXI.pop();
    assert.equal(hasConfirmedLineups(partial), false);
});

test('uses the free-plan lineup endpoint only for supplied cards, deduplicates and caches results', async () => {
    const fixtures = Array.from({ length: 45 }, (_, i) => fixture(i + 10));
    const ids = [];
    globalThis.agendaApi = async (path, { params }) => {
        assert.equal(path, '/fixtures/lineups');
        assert.deepEqual(Object.keys(params), ['fixture']);
        const id = params.fixture;
        ids.push(id);
        return reply(id % 2 ? [] : confirmed(fixture(id)).lineups);
    };
    const result = await apiFootballService.getLineupConfirmations([...fixtures, fixtures[0]]);
    assert.equal(ids.length, 45);
    assert.equal(result.size, 45);
    assert.equal(result.get(10), 'confirmed');
    assert.equal(result.get(11), 'unconfirmed');
    await apiFootballService.getLineupConfirmations(fixtures);
    assert.equal(ids.length, 45);
    mock.timers.tick(60001);
    await apiFootballService.getLineupConfirmations(fixtures);
    assert.equal(ids.length, 67);
    assert.ok(ids.slice(45).every(id => id % 2 === 1));
});

test('reuses in-flight lineup requests for overlapping visible cards', async () => {
    const resolvers = [];
    let calls = 0;
    globalThis.agendaApi = () => { calls++; return new Promise(r => { resolvers.push(r); }); };
    const first = apiFootballService.getLineupConfirmations([fixture(100), fixture(101)]);
    const second = apiFootballService.getLineupConfirmations([fixture(101)]);
    resolvers[0](reply(confirmed(fixture(100)).lineups));
    resolvers[1](reply([]));
    assert.equal((await first).get(100), 'confirmed');
    assert.equal((await second).get(101), 'unconfirmed');
    assert.equal(calls, 2);
});

test('rechecks unconfirmed lineups and distinguishes missing data and failures', async () => {
    globalThis.agendaApi = async (_, { params }) => {
        if (params.fixture === 2) throw new Error('offline');
        return reply([]);
    };
    let statuses = await apiFootballService.getLineupConfirmations([fixture(1), fixture(2)]);
    assert.equal(statuses.get(1), 'unconfirmed');
    assert.equal(statuses.get(2), 'unavailable');
    mock.timers.tick(60001);
    globalThis.agendaApi = async () => reply(confirmed(fixture(1)).lineups);
    assert.equal((await apiFootballService.getLineupConfirmations([fixture(1)])).get(1), 'confirmed');
    globalThis.agendaApi = async () => reply([], { rateLimit: 'Exceeded' });
    statuses = await apiFootballService.getLineupConfirmations([fixture(3)]);
    assert.equal(statuses.get(3), 'unavailable');
});

test('classifies live, finished and exceptional statuses and formats Brasília kickoff', () => {
    for (const status of ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT']) assert.equal(isFixtureLive(fixture(1, status)), true);
    for (const status of ['FT', 'AET', 'PEN']) {
        assert.equal(isFixtureFinished(fixture(1, status)), true);
        assert.equal(isFixtureLive(fixture(1, status)), false);
    }
    for (const status of ['NS', 'TBD', 'PST', 'CANC', 'SUSP', 'ABD', 'AWD', 'WO']) {
        assert.equal(isFixtureFinished(fixture(1, status)), false);
        assert.equal(isFixtureLive(fixture(1, status)), false);
    }
    assert.equal(fixtureTimeLabel(fixture(1)), '23:30');
    assert.equal(fixtureTimeLabel(fixture(1, 'NS', 'bad-date')), '--:--');
    assert.equal(fixtureTimeLabel(fixture(1, 'PST')), 'Adiada');
    assert.equal(fixtureTimeLabel(fixture(1, 'CANC')), 'Cancelada');
});
