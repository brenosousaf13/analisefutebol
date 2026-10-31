import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { buildAnalysisSavePayload } from '../src/services/analysisSavePayload.ts';

const ownerA = '10000000-0000-4000-8000-000000000001';
const ownerB = '10000000-0000-4000-8000-000000000002';
const token = '30000000-0000-4000-8000-000000000001';
const fixture = await readFile(new URL('./fixtures/shared-analysis-schema.sql', import.meta.url), 'utf8');
const sharing = await readFile(new URL('../supabase/migrations/20261003_01_shared_analysis_rpc.sql', import.meta.url), 'utf8');
const closeReads = await readFile(new URL('../supabase/migrations/20261003_02_close_shared_table_reads.sql', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261031_02_atomic_analysis_save.sql', import.meta.url), 'utf8');
const supabaseUrl = new URL('../src/lib/supabase.ts', import.meta.url).href;
registerHooks({
    resolve(specifier, context, next) {
        if (context.parentURL?.includes('/src/') && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
            return next(`${specifier}.ts`, context);
        }
        return next(specifier, context);
    },
    load(url, context, next) {
        if (url === supabaseUrl) return {
            format: 'module', source: 'export const supabase = globalThis.atomicSaveTransport;', shortCircuit: true,
        };
        return next(url, context);
    },
});

const emptyScene = () => Object.fromEntries([
    'homePlayersDef', 'homePlayersOff', 'awayPlayersDef', 'awayPlayersOff',
    'homeSubstitutes', 'awaySubstitutes', 'homeArrowsDef', 'homeArrowsOff',
    'awayArrowsDef', 'awayArrowsOff', 'homeRectanglesDef', 'homeRectanglesOff',
    'awayRectanglesDef', 'awayRectanglesOff',
].map(key => [key, []]));
const player = (id = 123) => ({ id, name: 'Jogador', number: 9, position: { x: 12.5, y: 67.25 }, note: 'Nota individual' });
const arrow = () => ({ id: 'drawing', startX: 2.5, startY: 8, endX: 34.25, endY: 88, color: '#FFFFFF' });
const analysis = () => ({
    ...emptyScene(), homeTeam: 'Equipe A', awayTeam: 'Equipe B',
    homeTeamColor: '#EF4444', awayTeamColor: '#3B82F6',
    titulo: 'Original', status: 'finalizada', competition: 'Campeonato',
    notasCasa: 'Legado', notasVisitante: '', homeNoteHtml: '<h2>Nota formatada</h2>',
    homePlayersOff: [player()], awayPlayersDef: [player(321)],
    homeArrowsOff: [arrow()], awayRectanglesDef: [{ ...arrow(), opacity: 0.4 }],
    homeBallOff: { x: 42.5, y: 55 }, events: [{ type: '_meta', videoUrl: 'video-legado' }], tags: ['pressão'],
    boards: [
        { ...emptyScene(), id: 'local-scene-z', title: 'Mesmo título', order: 2, homeSubstitutes: [player(101)] },
        { ...emptyScene(), id: 'local-scene-a', title: 'Mesmo título', order: 1, awayPlayersOff: [player(202)] },
    ],
});

test('atomic save: failure rollback, ownership and compatibility on PostgreSQL 17', async t => {
    // Isolated PostgreSQL only: no .env, network, production records or credentials.
    const db = new PGlite();
    t.after(() => db.close());
    await db.exec(fixture);
    await db.exec(sharing);
    await db.exec(closeReads);
    await db.exec(migration);
    await db.exec(migration);

    async function asRole(role, user, action) {
        assert.ok(['anon', 'authenticated'].includes(role));
        await db.exec(`set role ${role}`);
        await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user || '']);
        try { return await action(); }
        finally { await db.exec('reset role'); }
    }
    const save = (payload, user = ownerA) => asRole('authenticated', user, async () =>
        (await db.query('select public.save_analysis_v1($1::jsonb) as id', [JSON.stringify(payload)])).rows[0].id);
    async function snapshot(id) {
        const result = {};
        for (const table of ['analyses', 'analysis_boards', 'analysis_players', 'analysis_arrows', 'analysis_rectangles', 'analysis_tags', 'analysis_field_texts']) {
            result[table] = (await db.query(`select * from public.${table} where ${table === 'analyses' ? 'id' : 'analysis_id'}=$1 order by id`, [id])).rows;
        }
        return result;
    }
    const originalData = analysis();
    let original;
    let originalId;

    await t.test('one save creates the complete analysis, correct phases and scenes regardless of order/title', async () => {
        original = buildAnalysisSavePayload(originalData);
        originalId = await save(original);
        assert.equal(originalId, original.id);
        const stored = await snapshot(originalId);
        assert.equal(stored.analyses[0].competition, 'Campeonato');
        assert.equal(stored.analyses[0].home_note_html, originalData.homeNoteHtml);
        assert.equal(stored.analyses[0].notas_casa, 'Legado');
        assert.deepEqual(stored.analyses[0].events, originalData.events);
        assert.equal(stored.analysis_players.length, 4);
        assert.deepEqual(stored.analysis_players.find(p => p.player_id === 123).x, 12.5);
        assert.equal(stored.analysis_players.find(p => p.player_id === 101).board_id, original.boards[0].id);
        assert.equal(stored.analysis_players.find(p => p.player_id === 202).board_id, original.boards[1].id);
        assert.equal(originalData.boards[0].id, 'local-scene-z');
    });
    await t.test('updates keep optional/legacy fields, owner, creation timestamp, share token and video metadata', async () => {
        await db.query('update public.analyses set share_token=$2, home_notes=$3 where id=$1', [originalId, token, 'Anotação anterior ao editor']);
        const before = (await snapshot(originalId)).analyses[0];
        const edited = buildAnalysisSavePayload({ ...originalData, id: originalId, titulo: undefined, status: undefined,
            competition: undefined, homeNoteHtml: undefined, events: [{ type: 'goal', team: 'home' }] });
        edited.analysis.user_id = ownerB;
        edited.analysis.share_token = null;
        edited.analysis.created_at = '2000-01-01';
        await save(edited);
        const after = (await snapshot(originalId)).analyses[0];
        assert.equal(after.user_id, ownerA);
        assert.equal(after.share_token, token);
        assert.equal(after.created_at.getTime(), before.created_at.getTime());
        assert.equal(after.titulo, before.titulo);
        assert.equal(after.status, before.status);
        assert.equal(after.competition, before.competition);
        assert.equal(after.home_note_html, before.home_note_html);
        assert.equal(after.home_notes, before.home_notes);
        assert.ok(after.events.some(e => e.type === '_meta' && e.videoUrl === 'video-legado'));
        assert.ok(after.events.some(e => e.type === 'goal'));
    });
    await t.test('preserves stable scene IDs and unedited field texts/tags on repeated saves', async () => {
        await db.query(`insert into public.analysis_field_texts (analysis_id,board_id,team,variant,x,y,content)
            values ($1,$2,'home','offensive',12,34,'Texto existente')`, [originalId, original.boards[0].id]);
        await db.query("insert into public.analysis_tags (analysis_id,tag_value,tag_type) values ($1,'legado','other')", [originalId]);
        const before = await snapshot(originalId);
        for (let i = 0; i < 2; i++) await save(buildAnalysisSavePayload({ ...originalData, id: originalId }));
        const after = await snapshot(originalId);
        assert.deepEqual(after.analysis_boards, before.analysis_boards);
        assert.deepEqual(after.analysis_field_texts, before.analysis_field_texts);
        assert.deepEqual(after.analysis_tags, before.analysis_tags);
        assert.equal(after.analysis_players.length, 4);
    });

    for (const [stage, table, operation] of [
        ['metadata update', 'analyses', 'update'],
        ['scene creation', 'analysis_boards', 'insert'],
        ['scene removal', 'analysis_boards', 'delete'],
        ['player cleanup', 'analysis_players', 'delete'],
        ['arrow cleanup', 'analysis_arrows', 'delete'],
        ['rectangle cleanup', 'analysis_rectangles', 'delete'],
        ['player insert', 'analysis_players', 'insert'],
        ['arrow insert', 'analysis_arrows', 'insert'],
        ['final rectangle insert', 'analysis_rectangles', 'insert'],
    ]) {
        await t.test(`a failure during ${stage} leaves every previous record unchanged`, async () => {
            await db.exec(`create or replace function public.fail_test_save() returns trigger language plpgsql as $$
                begin raise exception 'Synthetic save failure'; end; $$;
                create trigger fail_test_save before ${operation} on public.${table}
                for each row execute function public.fail_test_save();`);
            const before = await snapshot(originalId);
            const nextData = { ...originalData, id: originalId, titulo: 'Não deve ficar parcialmente salvo' };
            if (operation === 'delete' && table === 'analysis_boards') nextData.boards = [];
            if (operation === 'insert' && table === 'analysis_boards') nextData.boards = [...originalData.boards, { ...emptyScene(), id: 'new', title: 'Nova', order: 3 }];
            const next = buildAnalysisSavePayload(nextData);
            await assert.rejects(save(next), /Synthetic save failure/);
            assert.deepEqual(await snapshot(originalId), before);
            await db.exec(`drop trigger fail_test_save on public.${table}`);
        });
    }
    await t.test('a late failure on a new analysis leaves no orphan parent, scene or player', async () => {
        const payload = buildAnalysisSavePayload(analysis());
        payload.rectangles[0].color = null;
        await assert.rejects(save(payload), error => error.code === '23502');
        for (const rows of Object.values(await snapshot(payload.id))) assert.equal(rows.length, 0);
    });
    await t.test('missing arrays, invalid values and cross-scene references cannot erase existing content', async () => {
        const before = await snapshot(originalId);
        const badInputs = [
            p => { delete p.players; }, p => { p.arrows = null; },
            p => { p.boards.push({ ...p.boards[0] }); },
            p => { p.players[0].board_id = '40000000-0000-4000-8000-000000000099'; },
            p => { p.players[0].name = null; }, p => { p.analysis.events = null; },
        ];
        for (const makeBad of badInputs) {
            const payload = structuredClone(buildAnalysisSavePayload({ ...originalData, id: originalId }));
            makeBad(payload);
            await assert.rejects(save(payload));
            assert.deepEqual(await snapshot(originalId), before);
        }
    });
    await t.test('another user cannot update, recreate or attach an existing scene to another analysis', async () => {
        const before = await snapshot(originalId);
        await assert.rejects(save(buildAnalysisSavePayload({ ...originalData, id: originalId }), ownerB), e => e.code === '42501');
        const recreate = buildAnalysisSavePayload({ ...originalData, id: originalId });
        recreate.is_new = true;
        await assert.rejects(save(recreate, ownerB));
        const other = buildAnalysisSavePayload(analysis());
        other.boards[0].id = original.boards[0].id;
        other.players = [];
        await assert.rejects(save(other, ownerB));
        assert.deepEqual(await snapshot(originalId), before);
        assert.equal((await snapshot(other.id)).analyses.length, 0);
    });
    await t.test('anonymous calls and sessions without a user ID cannot save', async () => {
        const payload = buildAnalysisSavePayload(analysis());
        await assert.rejects(asRole('anon', null, () => db.query('select public.save_analysis_v1($1)', [JSON.stringify(payload)])), e => e.code === '42501');
        await assert.rejects(save(payload, null), e => e.code === '42501');
    });
    await t.test('copying an analysis makes independent scene identities and preserves the source', async () => {
        const before = await snapshot(originalId);
        const copy = buildAnalysisSavePayload({ ...originalData, boards: original.boards.map((b, index) => ({ ...originalData.boards[index], id: b.id })) });
        await save(copy);
        assert.notEqual(copy.boards[0].id, original.boards[0].id);
        assert.deepEqual(await snapshot(originalId), before);
        assert.equal((await snapshot(copy.id)).analysis_boards.length, 2);
    });
    await t.test('removing a scene removes only that scene and saving empty drawings is intentional', async () => {
        const created = buildAnalysisSavePayload(analysis());
        await save(created);
        const next = buildAnalysisSavePayload({ ...analysis(), id: created.id, boards: [], homeArrowsOff: [], awayRectanglesDef: [] });
        await save(next);
        const stored = await snapshot(created.id);
        assert.equal(stored.analysis_boards.length, 0);
        assert.equal(stored.analysis_arrows.length, 0);
        assert.equal(stored.analysis_rectangles.length, 0);
        assert.equal(stored.analysis_players.length, 2);
    });
    await t.test('actual service uses one RPC, propagates failure and never falls back to independent writes', async () => {
        const calls = [];
        let fail = false;
        globalThis.atomicSaveTransport = {
            auth: { getUser: async () => ({ data: { user: { id: ownerA } }, error: null }) },
            rpc: async (name, args) => {
                calls.push(name);
                if (fail) return { data: null, error: new Error('Falha de transporte simulada') };
                try { return { data: await save(args.p_payload), error: null }; }
                catch (error) { return { data: null, error }; }
            },
            from: () => { throw new Error('Independent writes must not be used'); },
        };
        const { analysisService } = await import('../src/services/analysisService.ts');
        const id = await analysisService.saveAnalysis(analysis());
        assert.deepEqual(calls, ['save_analysis_v1']);
        const before = await snapshot(id);
        fail = true;
        await assert.rejects(analysisService.saveAnalysis({ ...analysis(), id }), /transporte/);
        assert.deepEqual(await snapshot(id), before);
        assert.equal(calls.length, 2);
    });
    await t.test('an incomplete load rejects instead of returning empty rosters/drawings to the editor', async () => {
        const { analysisService } = await import('../src/services/analysisService.ts');
        for (const failedTable of ['analyses', 'analysis_boards', 'analysis_players', 'analysis_arrows', 'analysis_rectangles']) {
            globalThis.atomicSaveTransport.from = table => {
                const query = {
                    select: () => query, eq: () => query, single: () => query,
                    order: () => query, update: () => query,
                    then: resolve => Promise.resolve({
                        data: table === 'analyses' ? { id: originalId } : [],
                        error: table === failedTable ? new Error(`Leitura interrompida: ${table}`) : null,
                    }).then(resolve),
                };
                return query;
            };
            await assert.rejects(analysisService.getAnalysis(originalId), new RegExp(failedTable));
        }
    });
});
