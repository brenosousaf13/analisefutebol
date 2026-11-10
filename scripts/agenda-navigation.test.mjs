import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import {
    addDays, addMonths, agendaBounds, clampDate, formatLongDate, formatNavLabel, monthCells, todayInBrasilia,
} from '../src/utils/agendaDates.ts';
import { groupFixturesByLeague, matchesSearch, roundLabel } from '../src/utils/leagueDisplay.ts';
import { FootballPlanError } from '../src/services/footballRequestQueue.ts';

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
const fixture = (id, { status = 'NS', date = '2026-11-09T16:00:00-03:00', league = 71, country = 'Brazil', round = 'Regular Season - 34', home = `Casa ${id}`, away = `Fora ${id}` } = {}) => ({
    fixture: { id, date, timestamp: Date.parse(date) / 1000, status: { short: status } },
    league: { id: league, name: `Liga ${league}`, country, round },
    teams: { home: { id: id * 2, name: home }, away: { id: id * 2 + 1, name: away } },
    goals: { home: 1, away: 0 },
});

beforeEach(() => {
    storage.clear();
    apiFootballService.forgetPlanWindow();
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-09T15:00:00Z') }); // 12h em Brasília
});
afterEach(() => mock.timers.reset());

// ---------- datas ----------

test('computes Brasília today and moves days and months without timezone drift', () => {
    assert.equal(todayInBrasilia(Date.parse('2026-11-01T01:00:00Z')), '2026-10-31');
    assert.equal(todayInBrasilia(Date.parse('2026-11-01T03:00:00Z')), '2026-11-01');
    assert.equal(addDays('2026-11-02', -7), '2026-10-26');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
    assert.equal(addMonths('2026-11-09', -6), '2026-05-09');
    assert.equal(addMonths('2026-08-31', -6), '2026-02-28');
    assert.equal(addMonths('2028-08-31', -6), '2028-02-29');
    assert.equal(addMonths('2026-03-15', -6), '2025-09-15');
});

test('limits the agenda to 7 days back by arrows and 6 months back by calendar, never past today', () => {
    assert.deepEqual(agendaBounds('2026-11-09'), { arrowMin: '2026-11-02', calendarMin: '2026-05-09', max: '2026-11-09' });
    assert.equal(clampDate('2026-01-01', '2026-05-09', '2026-11-09'), '2026-05-09');
    assert.equal(clampDate('2026-12-01', '2026-05-09', '2026-11-09'), '2026-11-09');
    assert.equal(clampDate('2026-08-01', '2026-05-09', '2026-11-09'), '2026-08-01');
});

test('labels the date between the arrows and lays out calendar months starting on Sunday', () => {
    assert.equal(formatNavLabel('2026-11-09', '2026-11-09'), 'Hoje');
    assert.equal(formatNavLabel('2026-11-02', '2026-11-09'), 'seg, 02/11');
    assert.equal(formatLongDate('2026-11-03'), 'terça-feira, 3 de novembro de 2026');
    const november = monthCells(2026, 11);
    assert.equal(november.length, 30); // 1º de novembro de 2026 é domingo
    assert.equal(november[0], '2026-11-01');
    const october = monthCells(2026, 10);
    assert.deepEqual(october.slice(0, 5), [null, null, null, null, '2026-10-01']); // quinta-feira
    assert.equal(october.at(-1), '2026-10-31');
});

// ---------- agrupamento e busca ----------

test('translates rounds and shows one only when the whole league shares it', () => {
    assert.equal(roundLabel('Regular Season - 34'), 'Rodada 34');
    assert.equal(roundLabel('League Stage - 4'), 'Fase de liga · Rodada 4');
    assert.equal(roundLabel('Quarter-finals'), 'Quartas de final');
    assert.equal(roundLabel('Clausura - 18'), 'Clausura · Rodada 18');
    assert.equal(roundLabel(''), undefined);
    const mixed = groupFixturesByLeague([
        fixture(1, { league: 71, round: 'Regular Season - 34' }),
        fixture(2, { league: 71, round: 'Regular Season - 33' }),
    ]);
    assert.equal(mixed[0].subtitle, 'Brasil');
});

test('groups by league with Brazilian leagues first and kickoff order inside each league', () => {
    const groups = groupFixturesByLeague([
        fixture(1, { league: 39, country: 'England', date: '2026-11-09T10:00:00-03:00' }),
        fixture(2, { league: 71, date: '2026-11-09T21:30:00-03:00' }),
        fixture(3, { league: 71, date: '2026-11-09T19:30:00-03:00' }),
        fixture(4, { league: 999, country: 'World', round: 'Final', date: '2026-11-09T08:00:00-03:00' }),
    ]);
    assert.deepEqual(groups.map(g => g.leagueId), [71, 39, 999]);
    assert.deepEqual(groups[0].fixtures.map(f => f.fixture.id), [3, 2]);
    assert.equal(groups[0].name, 'Brasileirão Série A');
    assert.equal(groups[0].subtitle, 'Brasil · Rodada 34');
    assert.equal(groups[1].subtitle, 'Inglaterra · Rodada 34');
    assert.equal(groups[2].subtitle, 'Internacional · Final');
});

test('team search ignores case and accents and can include league names', () => {
    const f = fixture(1, { home: 'Atlético Mineiro', away: 'São Paulo', league: 71 });
    assert.equal(matchesSearch(f, ''), true);
    assert.equal(matchesSearch(f, 'ATLETICO'), true);
    assert.equal(matchesSearch(f, 'sao paulo'), true);
    assert.equal(matchesSearch(f, 'flamengo'), false);
    assert.equal(matchesSearch(f, 'brasileirao'), false);
    assert.equal(matchesSearch(f, 'brasileirao', true), true);
});

// ---------- consultas por dia ----------

test('one request per day serves both the tracked agenda and the all-leagues search', async () => {
    let calls = 0;
    globalThis.agendaApi = async (path, { params }) => {
        calls++;
        assert.equal(path, '/fixtures');
        assert.deepEqual(params, { date: '2026-11-09', timezone: 'America/Sao_Paulo' });
        return reply([fixture(1, { league: 999 }), fixture(2, { league: 71 })]);
    };
    assert.deepEqual((await apiFootballService.getDayFixtures('2026-11-09')).map(f => f.fixture.id), [2]);
    assert.deepEqual((await apiFootballService.getDayFixtures('2026-11-09', 'all')).map(f => f.fixture.id), [1, 2]);
    assert.equal(calls, 1);
});

test('a finished past day is requested once and then served from cache for days', async () => {
    let calls = 0;
    globalThis.agendaApi = async (_, { params }) => {
        calls++;
        return reply([fixture(1, { status: 'FT', date: `${params.date}T16:00:00-03:00` }), fixture(2, { status: 'PST', date: `${params.date}T18:00:00-03:00` })]);
    };
    await apiFootballService.getDayFixtures('2026-11-06');
    await apiFootballService.getDayFixtures('2026-11-06');
    mock.timers.tick(3 * 24 * 60 * 60 * 1000);
    await apiFootballService.getDayFixtures('2026-11-06');
    assert.equal(calls, 1);
    mock.timers.tick(5 * 24 * 60 * 60 * 1000);
    await apiFootballService.getDayFixtures('2026-11-06');
    assert.equal(calls, 2);
});

test('a past day with games still unfinished is refreshed after 15 minutes, not 7 days', async () => {
    let calls = 0;
    globalThis.agendaApi = async () => { calls++; return reply([fixture(1, { status: '2H' })]); };
    await apiFootballService.getDayFixtures('2026-11-08');
    mock.timers.tick(14 * 60 * 1000);
    await apiFootballService.getDayFixtures('2026-11-08');
    assert.equal(calls, 1);
    mock.timers.tick(61 * 1000);
    await apiFootballService.getDayFixtures('2026-11-08');
    assert.equal(calls, 2);
});

test('a plan error teaches the allowed range; other blocked dates cost no request, but today is never pre-blocked', async () => {
    let calls = 0;
    globalThis.agendaApi = async (_, { params }) => {
        calls++;
        if (params.date < '2026-11-09') {
            return reply([], { plan: 'Free plans do not have access to this date, try from 2026-11-09 to 2026-11-11.' });
        }
        return reply([fixture(1)]);
    };
    await assert.rejects(apiFootballService.getDayFixtures('2026-11-08'), error => {
        assert.ok(error instanceof FootballPlanError);
        assert.deepEqual([error.from, error.to], ['2026-11-09', '2026-11-11']);
        assert.match(error.message, /09\/11 a 11\/11/);
        return true;
    });
    assert.equal(calls, 1);
    await assert.rejects(apiFootballService.getDayFixtures('2026-11-05'), FootballPlanError);
    await assert.rejects(apiFootballService.getDayFixtures('2026-05-12'), FootballPlanError);
    assert.equal(calls, 1);
    // dentro do intervalo e hoje continuam consultando normalmente
    assert.equal((await apiFootballService.getDayFixtures('2026-11-09')).length, 1);
    assert.equal(calls, 2);
    // depois de trocar de plano, "tentar novamente" esquece o intervalo
    apiFootballService.forgetPlanWindow();
    await assert.rejects(apiFootballService.getDayFixtures('2026-11-05'), FootballPlanError);
    assert.equal(calls, 3);
    // no dia seguinte o intervalo aprendido deixa de valer
    mock.timers.tick(24 * 60 * 60 * 1000);
    await assert.rejects(apiFootballService.getDayFixtures('2026-11-05'), FootballPlanError);
    assert.equal(calls, 4);
});

test('keeps cached days apart and does not mix dates', async () => {
    globalThis.agendaApi = async (_, { params }) => reply([fixture(params.date === '2026-11-09' ? 1 : 2)]);
    assert.deepEqual((await apiFootballService.getDayFixtures('2026-11-09')).map(f => f.fixture.id), [1]);
    assert.deepEqual((await apiFootballService.getDayFixtures('2026-11-10')).map(f => f.fixture.id), [2]);
    assert.deepEqual((await apiFootballService.getDayFixtures('2026-11-09')).map(f => f.fixture.id), [1]);
});
