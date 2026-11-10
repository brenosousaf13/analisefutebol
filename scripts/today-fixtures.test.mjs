import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { setImmediate as flushTasks } from 'node:timers/promises';
import { fixtureTimeLabel, hasConfirmedLineups, isFixtureFinished, isFixtureLive, isFixtureStartingSoon } from '../src/utils/fixtureStatus.ts';

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
const reply = (response, errors = []) => ({
    data: { response, errors },
    headers: { 'x-ratelimit-limit': '10000', 'x-ratelimit-remaining': '10000' },
});
const fixture = (id, status = 'NS', date = '2026-10-31T23:30:00-03:00', league = 39) => ({
    fixture: { id, date, timestamp: Date.parse(date) / 1000, status: { short: status } },
    league: { id: league, name: `Liga ${league}` },
    teams: { home: { id: id * 2 }, away: { id: id * 2 + 1 } },
    goals: { home: 2, away: 1 },
});
const soon = (id, minutes = 30) => fixture(id, 'NS', new Date(Date.now() + minutes * 60000).toISOString());
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
        fixture(5, 'NS', '2026-10-31T08:00:00-03:00', 75),
        fixture(6, 'NS', '2026-10-31T22:00:00-03:00', 94),
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
    assert.equal(calls, 1);
    mock.timers.tick(15 * 60 * 1000);
    await apiFootballService.getTodayFixtures();
    assert.equal(calls, 2);
});

test('refreshes the agenda every 2 minutes when a match is live or about to start', async () => {
    let calls = 0;
    globalThis.agendaApi = async () => { calls++; return reply([fixture(1, '2H', undefined, 39)]); };
    await apiFootballService.getTodayFixtures();
    mock.timers.tick(60001);
    await apiFootballService.getTodayFixtures();
    assert.equal(calls, 1);
    mock.timers.tick(60001);
    await apiFootballService.getTodayFixtures();
    assert.equal(calls, 2);
});

test('keeps the last agenda when the daily API quota is exhausted, and explains the error when there is none', async () => {
    let calls = 0;
    globalThis.agendaApi = async () => { calls++; return reply([fixture(1, '2H')]); };
    await apiFootballService.getTodayFixtures();
    mock.timers.tick(2 * 60 * 1000 + 1);
    globalThis.agendaApi = async () => { calls++; return reply([], { requests: 'You have reached the request limit for the day' }); };
    assert.deepEqual((await apiFootballService.getTodayFixtures()).map(f => f.fixture.id), [1]);
    storage.clear();
    await assert.rejects(apiFootballService.getTodayFixtures(), error => error.dailyLimit === true && /limite diário/.test(error.message));
    const before = calls;
    await assert.rejects(apiFootballService.getTodayFixtures(), error => error.dailyLimit === true);
    assert.equal(calls, before);
});

test('includes exactly the competitions from the Zona 14 spreadsheet, with country-specific ids', async () => {
    const ids = [71, 72, 73, 13, 11, 541, 2, 3, 848, 531, 15, 39, 45, 48, 140, 143, 135, 137, 78, 81, 61, 66, 128, 130,
        1, 34, 32, 29, 30, 31, 33, 37, 10, 4, 5, 9, 22, 6, 7, 806, 913];
    const allowed = ids.map((id, i) => fixture(i + 1, 'NS', undefined, id));
    // Ligas da lista antiga que não estão na planilha, e homônimas de outros países.
    const excluded = [75, 94, 88, 144, 203, 307, 253, 262, 235, 333, 239, 265, 268, 242, 250, 252, 281, 218, 40, 667, 666, 36, 960];
    globalThis.agendaApi = async () => reply([...allowed, ...excluded.map((id, i) => fixture(i + 100, 'NS', undefined, id))]);
    assert.deepEqual((await apiFootballService.getTodayFixtures()).map(f => f.league.id), ids);
});

test('returns no games when only unlisted leagues have matches, without falling back to all leagues', async () => {
    globalThis.agendaApi = async () => reply([fixture(1, 'NS', undefined, 75), fixture(2, 'FT', undefined, 94)]);
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
    await flushTasks();
    resolve(reply([fixture(1)]));
    await Promise.all([first, second]);
    assert.equal(calls, 1);
});

test('does not turn network failures or API quota errors into an empty successful agenda', async () => {
    globalThis.agendaApi = async () => reply([], { plan: 'Unavailable for this plan' });
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
    const fixtures = Array.from({ length: 45 }, (_, i) => soon(i + 10));
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
    mock.timers.tick(5 * 60 * 1000 + 1);
    await apiFootballService.getLineupConfirmations(fixtures);
    assert.equal(ids.length, 67);
    assert.ok(ids.slice(45).every(id => id % 2 === 1));
});

test('reuses in-flight lineup requests for overlapping visible cards', async () => {
    const resolvers = [];
    let calls = 0;
    globalThis.agendaApi = () => { calls++; return new Promise(r => { resolvers.push(r); }); };
    const first = apiFootballService.getLineupConfirmations([soon(100), soon(101)]);
    const second = apiFootballService.getLineupConfirmations([soon(101)]);
    await flushTasks();
    resolvers[0](reply(confirmed(fixture(100)).lineups));
    await flushTasks();
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
    let statuses = await apiFootballService.getLineupConfirmations([soon(1), soon(2)]);
    assert.equal(statuses.get(1), 'unconfirmed');
    assert.equal(statuses.get(2), 'pending');
    mock.timers.tick(5 * 60 * 1000 + 1);
    globalThis.agendaApi = async () => reply(confirmed(fixture(1)).lineups);
    assert.equal((await apiFootballService.getLineupConfirmations([soon(1)])).get(1), 'confirmed');
    globalThis.agendaApi = async () => reply([], { requests: 'Exceeded' });
    statuses = await apiFootballService.getLineupConfirmations([soon(3)]);
    assert.equal(statuses.get(3), 'pending');
});

test('ignores old cached failures and stale negatives and immediately recovers official lineups', async () => {
    storage.set('zona14_lineup_confirmation_400', JSON.stringify({ status: 'unavailable', ts: Date.now() }));
    storage.set('zona14_lineup_confirmation_401', JSON.stringify({ status: 'unconfirmed', ts: Date.now() }));
    globalThis.agendaApi = async (_, { params }) => reply(confirmed(fixture(params.fixture)).lineups);
    const statuses = await apiFootballService.getLineupConfirmations([soon(400), soon(401)]);
    assert.equal(statuses.get(400), 'confirmed');
    assert.equal(statuses.get(401), 'confirmed');
});

test('does not cache network errors and shares full lineups between the agenda and analysis editor', async () => {
    let calls = 0;
    globalThis.agendaApi = async (_, { params }) => {
        calls++;
        if (calls === 1) throw new Error('offline');
        return reply(confirmed(fixture(params.fixture)).lineups);
    };
    assert.equal((await apiFootballService.getLineupConfirmations([soon(500)])).get(500), 'pending');
    assert.equal((await apiFootballService.getLineupConfirmations([soon(500)])).get(500), 'confirmed');
    assert.equal((await apiFootballService.getLineups(500)).length, 2);
    await apiFootballService.getLineups(501);
    assert.equal((await apiFootballService.getLineupConfirmations([soon(501)])).get(501), 'confirmed');
    assert.equal(calls, 3);
});

test('rechecks a match inside the next hour after the starters are published', async () => {
    let published = false;
    const f = soon(600);
    globalThis.agendaApi = async () => reply(published ? confirmed(f).lineups : []);
    assert.equal((await apiFootballService.getLineupConfirmations([f])).get(600), 'unconfirmed');
    published = true;
    mock.timers.tick(5 * 60 * 1000 + 1);
    assert.equal((await apiFootballService.getLineupConfirmations([f])).get(600), 'confirmed');
});

test('only queries lineups for not-started matches starting within the next hour', async () => {
    const ids = [];
    globalThis.agendaApi = async (_, { params }) => { ids.push(params.fixture); return reply(confirmed(fixture(params.fixture)).lineups); };
    const cases = [
        soon(1, 1), soon(2, 60), soon(3, 61), soon(4, -1), soon(5, 0),
        fixture(6, '1H', new Date(Date.now() + 10 * 60000).toISOString()),
        fixture(7, 'FT', new Date(Date.now() + 10 * 60000).toISOString()),
        fixture(8, 'PST', new Date(Date.now() + 10 * 60000).toISOString()),
        fixture(9, 'TBD', new Date(Date.now() + 10 * 60000).toISOString()),
    ];
    const statuses = await apiFootballService.getLineupConfirmations(cases);
    assert.deepEqual(ids.sort(), [1, 2]);
    assert.deepEqual([...statuses.keys()].sort(), [1, 2]);
    assert.equal(isFixtureStartingSoon(soon(2, 60)), true);
    assert.equal(isFixtureStartingSoon(soon(3, 60.1)), false);
    assert.equal(isFixtureStartingSoon(soon(4, 0)), false);
});

test('stops a queued lineup check when the match starts before its turn', async () => {
    let calls = 0;
    globalThis.agendaApi = async () => { calls++; return reply(confirmed(fixture(900)).lineups); };
    const f = soon(900, 1);
    const pending = apiFootballService.getLineupConfirmations([f]);
    mock.timers.tick(61000);
    assert.equal((await pending).size, 0);
    assert.equal(calls, 0);
});

test('does not request cards cancelled before reaching the queue', async () => {
    let calls = 0;
    globalThis.agendaApi = async () => { calls++; return reply([]); };
    const controller = new AbortController();
    const pending = apiFootballService.getLineupConfirmations([soon(700)], controller.signal);
    controller.abort();
    assert.equal((await pending).size, 0);
    assert.equal(calls, 0);
});

test('an editor request reuses queued lineups even after the agenda subscriber leaves', async () => {
    let calls = 0;
    globalThis.agendaApi = async () => { calls++; return reply(confirmed(fixture(710)).lineups); };
    const controller = new AbortController();
    const agenda = apiFootballService.getLineupConfirmations([soon(710)], controller.signal);
    controller.abort();
    const editor = apiFootballService.getLineups(710);
    assert.equal((await editor).length, 2);
    await agenda;
    assert.equal(calls, 1);
});

test('accepts published starters identified by name when the provider has no player id', () => {
    const f = confirmed(fixture(800));
    for (const l of f.lineups) l.startXI.forEach(({ player }, i) => { player.id = null; player.name = `Jogador ${i}`; });
    assert.equal(hasConfirmedLineups(f), true);
    f.lineups[0].startXI[0].player.name = '';
    assert.equal(hasConfirmedLineups(f), false);
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
