import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { uniquePlayersById, normalizeAnalysisPlayers } from '../src/utils/uniquePlayers.ts';

// Exercise the real services with in-memory transports. No .env, network or DB.
const serviceUrl = new URL('../src/services/analysisService.ts', import.meta.url).href;
const apiUrl = new URL('../src/services/apiFootballService.ts', import.meta.url).href;
const supabaseUrl = new URL('../src/lib/supabase.ts', import.meta.url).href;
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (context.parentURL?.includes('/src/') && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
            return nextResolve(`${specifier}.ts`, context);
        }
        if (context.parentURL === apiUrl && specifier === 'axios') {
            return { url: 'test:football-transport', shortCircuit: true };
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url === supabaseUrl) {
            return { format: 'module', source: 'export const supabase = globalThis.playerTestDb;', shortCircuit: true };
        }
        if (url === 'test:football-transport') {
            return { format: 'module', source: 'export default { create: () => ({ get: (...args) => globalThis.playerTestApi(...args) }) };', shortCircuit: true };
        }
        if (url === apiUrl) {
            return { format: 'module-typescript', source: readFileSync(new URL(url), 'utf8').replace('import.meta.env.VITE_API_FOOTBALL_KEY', '"test-key"'), shortCircuit: true };
        }
        return nextLoad(url, context);
    },
});

function createDatabase() {
    const tables = Object.fromEntries(['analyses', 'analysis_players', 'analysis_boards', 'analysis_arrows', 'analysis_rectangles', 'analysis_tags'].map(t => [t, []]));
    let id = 0;
    return {
        tables,
        auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
        from(table) {
            let op = 'select', values, field, value, order, single = false;
            const query = {
                insert(v) { op = 'insert'; values = Array.isArray(v) ? v : [v]; return query; },
                update(v) { op = 'update'; values = v; return query; },
                delete() { op = 'delete'; return query; },
                select() { return query; },
                eq(f, v) { field = f; value = v; return query; },
                order(f) { order = f; return query; },
                single() { single = true; return query; },
                then(resolve, reject) {
                    try {
                        let rows = tables[table].filter(r => !field || r[field] === value);
                        if (op === 'insert') {
                            rows = values.map(v => ({ ...v, id: v.id ?? `row-${++id}` }));
                            tables[table].push(...rows);
                        } else if (op === 'update') {
                            rows.forEach(r => Object.assign(r, values));
                        } else if (op === 'delete') {
                            tables[table] = tables[table].filter(r => !rows.includes(r));
                        }
                        if (order) rows = [...rows].sort((a, b) => a[order] - b[order]);
                        return Promise.resolve({ data: single ? rows[0] : rows, error: null }).then(resolve, reject);
                    } catch (error) { return Promise.reject(error).then(resolve, reject); }
                },
            };
            return query;
        },
    };
}

const player = (id, name = 'Jogador', note) => ({ id, name, number: 1, position: { x: 12.5, y: 66.25 }, note });
function roster() {
    return {
        homePlayersDef: [], homePlayersOff: [], awayPlayersDef: [], awayPlayersOff: [],
        homeSubstitutes: [], awaySubstitutes: [],
        homeArrowsDef: [], homeArrowsOff: [], awayArrowsDef: [], awayArrowsOff: [],
        homeRectanglesDef: [], homeRectanglesOff: [], awayRectanglesDef: [], awayRectanglesOff: [],
    };
}

test('deduplicates by ID, preserves distinct players and notes without mutating input', () => {
    const original = [player(41169, 'Léo Jardim'), player(41169, 'Léo Jardim', 'Nota salva'), player(763, 'Léo Jardim')];
    const result = uniquePlayersById(original);
    assert.equal(result.length, 2);
    assert.equal(result[0].note, 'Nota salva');
    assert.deepEqual(result[0].position, { x: 12.5, y: 66.25 });
    assert.equal(original[0].note, undefined);
    assert.deepEqual(uniquePlayersById(result), result);
    assert.equal(uniquePlayersById([player(0, 'A'), player(0, 'B')]).length, 2);
});

test('keeps the same player independently in each team, phase and scene (including drafts)', () => {
    const p = player(41169, 'Léo Jardim', 'Nota');
    const data = {
        ...roster(), homePlayersDef: [p, p], homePlayersOff: [{ ...p, position: { x: 80, y: 30 } }, p],
        awaySubstitutes: [p, p], boards: [{ ...roster(), id: 'scene', title: 'Cena', order: 0, homeSubstitutes: [p, p] }],
        events: [{ type: '_meta', videoUrl: 'video-legado' }],
    };
    const cleaned = normalizeAnalysisPlayers(data);
    assert.equal(cleaned.homePlayersDef.length, 1);
    assert.deepEqual(cleaned.homePlayersOff[0].position, { x: 80, y: 30 });
    assert.equal(cleaned.awaySubstitutes.length, 1);
    assert.equal(cleaned.boards[0].homeSubstitutes.length, 1);
    assert.deepEqual(cleaned.events, data.events);
    assert.equal(data.homePlayersDef.length, 2);
});

test('squad endpoint and paginated fallback return one record per player', async () => {
    const { apiFootballService } = await import(apiUrl);
    globalThis.playerTestApi = async () => ({ data: { response: [{ players: [player(1), player(1), player(2)] }] } });
    assert.deepEqual((await apiFootballService.getSquad(451)).map(p => p.id), [1, 2]);

    globalThis.playerTestApi = async (path, { params }) => ({ data: path === '/players/squads'
        ? { response: [] }
        : { paging: { total: 2 }, response: [
            { player: { ...player(1), age: 28 }, statistics: [] },
            { player: { ...player(params.page + 1), age: 29 }, statistics: [] },
        ] } });
    assert.deepEqual((await apiFootballService.getSquad(133)).map(p => p.id), [1, 2, 3]);
});

test('loading old duplicates and saving repeatedly keeps each roster unique', async () => {
    globalThis.playerTestDb = createDatabase();
    const { analysisService } = await import(serviceUrl);
    // Like the editor, first detect the columns supported by the saved schema.
    globalThis.playerTestDb.tables.analyses.push({ id: 'schema-fixture', home_note_html: null, away_note_html: null });
    await analysisService.getAnalysis('schema-fixture');
    const p = player(41169, 'Léo Jardim', 'Nota individual');
    const data = {
        ...roster(), homeTeam: 'Boca', awayTeam: 'Vasco', homeTeamColor: '#EF4444', awayTeamColor: '#3B82F6',
        notasCasa: 'Nota antiga', notasVisitante: '', homeNoteHtml: '<h2>Nota formatada</h2>',
        awayNoteHtml: '', homeDefensiveNotes: '', homeOffensiveNotes: '', homeBenchNotes: '',
        awayDefensiveNotes: '', awayOffensiveNotes: '', awayBenchNotes: '', tags: [],
        awaySubstitutes: Array(5).fill(p), homePlayersDef: [p, p], homePlayersOff: [p, p],
        homeBallOff: { x: 42.5, y: 55 }, events: [{ type: '_meta', videoUrl: 'video-legado' }],
        boards: [{ ...roster(), id: 'scene', title: 'Cena 2', order: 1, awaySubstitutes: [p, p] }],
    };
    const id = await analysisService.saveAnalysis(data);
    const db = globalThis.playerTestDb;
    assert.equal(db.tables.analysis_players.length, 4);
    assert.equal(data.awaySubstitutes.length, 5);
    // Reproduce records already saved by the old application.
    const saved = db.tables.analysis_players.find(p => p.board_id === null && p.type === 'bench');
    db.tables.analysis_players.push({ ...saved, id: 'old-duplicate', note: 'Nota individual' });
    const { sharedAnalysisFromPayload } = await import('../src/services/sharedAnalysisData.ts');
    const shared = sharedAnalysisFromPayload({
        analysis: db.tables.analyses.find(a => a.id === id), boards: db.tables.analysis_boards,
        players: db.tables.analysis_players, arrows: [], rectangles: [],
    }, 'existing-share-token');
    assert.equal(shared.awaySubstitutes.length, 1);
    assert.equal(shared.boards[0].awaySubstitutes.length, 1);
    assert.equal(shared.awaySubstitutes[0].note, 'Nota individual');
    for (let i = 0; i < 3; i++) {
        const loaded = await analysisService.getAnalysis(id);
        assert.equal(loaded.awaySubstitutes.length, 1);
        assert.equal(loaded.awaySubstitutes[0].note, 'Nota individual');
        assert.equal(loaded.homePlayersDef.length, 1);
        assert.equal(loaded.homePlayersOff.length, 1);
        assert.equal(loaded.boards[0].awaySubstitutes.length, 1);
        assert.deepEqual(loaded.homePlayersDef[0].position, p.position);
        assert.deepEqual(loaded.events, data.events);
        assert.equal(loaded.homeNoteHtml, data.homeNoteHtml);
        assert.deepEqual(loaded.homeBallOff, data.homeBallOff);
        await analysisService.saveAnalysis(loaded);
        assert.equal(db.tables.analysis_players.length, 4);
    }
});
