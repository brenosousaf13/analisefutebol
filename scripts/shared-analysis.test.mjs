import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { sharedAnalysisFromPayload } from '../src/services/sharedAnalysisData.ts';

const ownerA = '10000000-0000-4000-8000-000000000001';
const ownerB = '10000000-0000-4000-8000-000000000002';
const sharedA = '20000000-0000-4000-8000-000000000001';
const sharedB = '20000000-0000-4000-8000-000000000002';
const privateA = '20000000-0000-4000-8000-000000000003';
const tokenA = '30000000-0000-4000-8000-000000000001';
const tokenB = '30000000-0000-4000-8000-000000000002';
const unknownToken = '30000000-0000-4000-8000-000000000099';
const boardA = '40000000-0000-4000-8000-000000000001';
const boardB = '40000000-0000-4000-8000-000000000002';
const tables = ['analyses', 'analysis_boards', 'analysis_players', 'analysis_arrows',
    'analysis_rectangles', 'analysis_tags', 'analysis_field_texts'];
const prepare = await readFile(new URL('../supabase/migrations/20261003_01_shared_analysis_rpc.sql', import.meta.url), 'utf8');
const closeReads = await readFile(new URL('../supabase/migrations/20261003_02_close_shared_table_reads.sql', import.meta.url), 'utf8');
const fixture = await readFile(new URL('./fixtures/shared-analysis-schema.sql', import.meta.url), 'utf8');

test('shared analyses: PostgreSQL permissions, token reader and compatibility', async t => {
    // In-memory database only. This suite never reads .env or connects to Supabase.
    const db = new PGlite();
    t.after(() => db.close());
    await db.exec(fixture);
    await db.query(`insert into public.analyses
        (id, user_id, share_token, home_team_name, away_team_name, tipo,
         home_note_html, notas_casa, events, tags, home_ball_off)
        values ($1, $2, $3, 'Equipe A', 'Equipe B', 'analise_completa',
          '<h2>Observação formatada</h2>', 'Nota antiga', $4, $5, $6),
          ($7, $8, $9, 'Equipe C', 'Equipe D', 'analise_completa',
          'Nota de outro usuário', '', '[]', '{}', null),
          ($10, $2, null, 'Equipe A', 'Equipe E', 'partida', '', '', '[]', '{}', null)`,
        [sharedA, ownerA, tokenA, JSON.stringify([{ type: '_meta', videoUrl: 'https://www.youtube.com/watch?v=example' }]),
            ['entrelinhas'], JSON.stringify({ x: 12.5, y: 66.25 }), sharedB, ownerB, tokenB, privateA]);
    await db.query(`insert into public.analysis_boards (id, analysis_id, title, "order")
        values ($1, $2, 'Cena A', 2), ($3, $4, 'Cena B', 1)`, [boardA, sharedA, boardB, sharedB]);
    await db.query(`insert into public.analysis_players
        (analysis_id, board_id, player_id, name, number, team, type, variant, x, y, note)
        values ($1, null, 101, 'Jogador A', 9, 'home', 'field', 'offensive', 19.5, 33.75, 'Nota individual'),
          ($1, $2, 101, 'Jogador A', 9, 'home', 'field', 'defensive', 55, 12.5, 'Nota individual'),
          ($1, null, 102, 'Reserva A', 12, 'home', 'bench', 'defensive', 0, 0, ''),
          ($3, $4, 202, 'Jogador B', 8, 'away', 'field', 'defensive', 40, 50, 'Nota de B')`,
        [sharedA, boardA, sharedB, boardB]);
    for (const table of ['analysis_arrows', 'analysis_rectangles']) {
        await db.query(`insert into public.${table}
            (analysis_id, board_id, team, variant, start_x, start_y, end_x, end_y, color)
            values ($1, null, 'home', 'offensive', 1.5, 2.5, 22.75, 40.25, '#FFFFFF'),
              ($1, $2, 'away', 'defensive', 50, 60, 70, 80, '#000000'),
              ($3, $4, 'away', 'defensive', 10, 20, 30, 40, '#FFFFFF')`,
            [sharedA, boardA, sharedB, boardB]);
    }
    await db.query(`insert into public.analysis_tags (analysis_id, tag_value, tag_type)
        values ($1, 'A', 'other'), ($2, 'B', 'other')`, [sharedA, sharedB]);
    await db.query(`insert into public.analysis_field_texts
        (analysis_id, board_id, team, variant, x, y, content)
        values ($1, $2, 'home', 'offensive', 10, 20, 'Texto A'),
          ($3, $4, 'away', 'defensive', 30, 40, 'Texto B')`, [sharedA, boardA, sharedB, boardB]);

    async function asRole(role, user, action) {
        assert.ok(['anon', 'authenticated'].includes(role));
        await db.exec(`set role ${role}`);
        await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user || '']);
        try { return await action(); }
        finally {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub', '', false)");
        }
    }
    async function getPayload(token) {
        return (await db.query('select public.get_shared_analysis_v1($1::uuid) as payload', [token])).rows[0].payload;
    }

    await t.test('reproduces the existing anonymous listing before the correction', async () => {
        const rows = await asRole('anon', null, async () => (await db.query('select id from public.analyses')).rows);
        assert.deepEqual(rows.map(r => r.id).sort(), [sharedA, sharedB].sort());
    });
    await t.test('closure refuses to run before preparation and leaves the old access intact', async () => {
        await assert.rejects(db.exec(closeReads), e => /Aplique primeiro/.test(e.message));
        await db.exec('rollback');
        const rows = await asRole('anon', null, async () => (await db.query('select id from public.analyses')).rows);
        assert.equal(rows.length, 2);
    });
    await t.test('preparation preserves the old reader until the application is updated', async () => {
        await db.exec(prepare);
        assert.equal((await asRole('anon', null, async () => (await db.query('select id from public.analyses')).rows)).length, 2);
        await db.exec(prepare); // Applying the preparation twice is safe.
    });
    await t.test('invalid, null or analysis ID tokens return no payload', async () => {
        await asRole('anon', null, async () => {
            for (const token of [unknownToken, null, sharedA, privateA]) assert.equal(await getPayload(token), null);
        });
    });
    await t.test('exact token returns only its analysis and children; internal fields stay private', async () => {
        await db.exec("alter table public.analyses add column internal_private_note text default 'private';");
        const payload = await asRole('anon', null, () => getPayload(tokenA));
        assert.equal(payload.analysis.id, sharedA);
        for (const key of ['user_id', 'share_token', 'ultimo_acesso', 'internal_private_note']) {
            assert.equal(Object.hasOwn(payload.analysis, key), false);
        }
        assert.deepEqual(payload.boards.map(b => b.id), [boardA]);
        assert.ok(payload.players.every(p => [101, 102].includes(p.player_id)));
        assert.equal(payload.players.length, 3);
        for (const name of ['arrows', 'rectangles', 'field_texts']) {
            assert.ok(payload[name].every(item => item.board_id === null || item.board_id === boardA));
        }
        assert.equal(payload.field_texts[0].content, 'Texto A');
    });
    await t.test('converter preserves rich/legacy notes, video metadata, scenes, phases and coordinates', async () => {
        const payload = await asRole('anon', null, () => getPayload(tokenA));
        const analysis = sharedAnalysisFromPayload(payload, tokenA);
        assert.equal(analysis.homeNoteHtml, '<h2>Observação formatada</h2>');
        assert.equal(analysis.notasCasa, 'Nota antiga');
        assert.equal(analysis.events[0].type, '_meta');
        assert.deepEqual(analysis.tags, ['entrelinhas']);
        assert.equal(analysis.shareToken, tokenA);
        assert.deepEqual(analysis.homePlayersOff[0].position, { x: 19.5, y: 33.75 });
        assert.equal(analysis.homeSubstitutes[0].id, 102);
        assert.deepEqual(analysis.homeBallOff, { x: 12.5, y: 66.25 });
        assert.equal(analysis.boards[0].homePlayersDef[0].id, 101);
        assert.equal(analysis.boards[0].awayArrowsDef.length, 1);
        assert.equal(analysis.homeArrowsOff[0].endX, 22.75);
        assert.equal(analysis.homeRectanglesOff[0].opacity, 0.5);
        assert.equal(sharedAnalysisFromPayload(null, tokenA), null);
    });
    await t.test('closure removes direct anonymous table access without breaking token links', async () => {
        await db.exec(closeReads);
        await db.exec(closeReads); // The closure is also repeatable.
        await asRole('anon', null, async () => {
            for (const table of tables) {
                await assert.rejects(db.query(`select id from public.${table}`), e => e.code === '42501');
            }
            assert.equal((await getPayload(tokenA)).analysis.id, sharedA);
            assert.equal((await getPayload(tokenB)).analysis.id, sharedB);
        });
    });
    await t.test('legacy rows with null phase/team still use the original defensive/away fallback', async () => {
        const payload = await asRole('anon', null, () => getPayload(tokenA));
        const rootPlayer = payload.players.find(p => p.board_id === null && p.type === 'field');
        rootPlayer.team = null;
        rootPlayer.variant = null;
        const analysis = sharedAnalysisFromPayload(payload, tokenA);
        const legacyPlayer = analysis.awayPlayersDef.concat(analysis.awaySubstitutes);
        assert.ok(legacyPlayer.some(p => p.id === rootPlayer.player_id));
    });
    await t.test('logged-in owner reads private/shared content; another user cannot enumerate it', async () => {
        const a = await asRole('authenticated', ownerA, async () => (await db.query('select id from public.analyses')).rows);
        assert.deepEqual(a.map(r => r.id).sort(), [sharedA, privateA].sort());
        const b = await asRole('authenticated', ownerB, async () => (await db.query('select id from public.analyses')).rows);
        assert.deepEqual(b.map(r => r.id), [sharedB]);
        await asRole('authenticated', ownerB, async () => {
            assert.equal((await db.query('select id from public.analysis_players where analysis_id=$1', [sharedA])).rows.length, 0);
            assert.equal((await getPayload(tokenA)).analysis.id, sharedA); // Knowing the link still permits public reading.
        });
    });
    await t.test('owner can edit; a different owner cannot edit or attach records to the analysis', async () => {
        await asRole('authenticated', ownerA, async () => {
            assert.equal((await db.query("update public.analyses set titulo='Editada' where id=$1 returning id", [sharedA])).rows.length, 1);
        });
        await asRole('authenticated', ownerB, async () => {
            assert.equal((await db.query("update public.analyses set titulo='Indevida' where id=$1 returning id", [sharedA])).rows.length, 0);
            await assert.rejects(db.query(`insert into public.analysis_boards (analysis_id,title) values ($1,'Indevida')`, [sharedA]), e => e.code === '42501');
        });
    });
    await t.test('anonymous and logged-in clients cannot bypass row security with TRUNCATE', async () => {
        for (const [role, user] of [['anon', null], ['authenticated', ownerA]]) {
            await asRole(role, user, async () => {
                for (const table of tables) await assert.rejects(db.query(`truncate public.${table} cascade`), e => e.code === '42501');
            });
        }
    });
    await t.test('revoking a token stops the public reader and keeps owner data', async () => {
        await db.query('update public.analyses set share_token=null where id=$1', [sharedA]);
        assert.equal(await asRole('anon', null, () => getPayload(tokenA)), null);
        const rows = await asRole('authenticated', ownerA, async () => (await db.query('select id from public.analyses where id=$1', [sharedA])).rows);
        assert.equal(rows.length, 1);
    });
    await t.test('a temporary table cannot redirect the privileged token reader', async () => {
        await db.exec(`create temporary table analyses (id uuid, share_token uuid);
            insert into analyses values ('${privateA}', '${tokenB}');
            grant select on analyses to anon;`);
        assert.equal((await asRole('anon', null, () => getPayload(tokenB))).analysis.id, sharedB);
        const settings = (await db.query("select proconfig from pg_proc where proname='get_shared_analysis_v1'")).rows[0].proconfig;
        assert.ok(settings.some(s => s === 'search_path=""'));
    });
});
