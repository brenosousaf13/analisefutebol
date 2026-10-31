import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const functionSql = await readFile(new URL('./fixtures/admin-dashboard-function.sql', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261031_01_restrict_admin_access.sql', import.meta.url), 'utf8');
const adminEmail = 'admin@example.test';
const userEmail = 'user@example.test';

test('administration: existing authorization and restricted permissions', async t => {
    // Synthetic accounts only. No .env, network calls or production records.
    const db = new PGlite();
    t.after(() => db.close());
    await db.exec(`
        create role anon;
        create role authenticated;
        create role service_role;
        create schema auth;
        grant usage on schema public, auth to anon, authenticated, service_role;
        create function auth.jwt() returns jsonb language sql stable as $$
            select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
        $$;
        create table auth.users (
            id uuid primary key, email varchar, raw_user_meta_data jsonb,
            created_at timestamptz, last_sign_in_at timestamptz
        );
        create table public.analyses (id uuid primary key, user_id uuid);
        create table public.admin_users (email text primary key);
        -- Deliberately broad starting grants: migration must also cover PUBLIC
        -- and explicit column grants, regardless of existing RLS policies.
        grant all on public.admin_users to public, anon, authenticated, service_role;
        grant select (email), insert (email), update (email), references (email)
            on public.admin_users to public, anon, authenticated;
    `);
    await db.exec(functionSql);
    await db.exec('grant execute on function public.get_admin_dashboard_stats() to anon, authenticated, service_role;');
    await db.query('insert into public.admin_users values ($1)', [adminEmail]);
    await db.query(`insert into auth.users values
        ('10000000-0000-4000-8000-000000000001', $1, '{"full_name":"Admin fictício"}', now(), now()),
        ('10000000-0000-4000-8000-000000000002', $2, '{"full_name":"Usuário fictício"}', now(), now())`,
    [adminEmail, userEmail]);
    await db.exec(`insert into public.analyses values
        ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');`);

    async function asRole(role, claims, action) {
        assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
        await db.exec(`set role ${role}`);
        await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(claims)]);
        try { return await action(); }
        finally {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claims', '{}', false)");
        }
    }
    const dashboard = () => db.query('select * from public.get_admin_dashboard_stats()');
    const accessDenied = error => /Access Denied/.test(error.message);
    const permissionDenied = error => error.code === '42501';

    await t.test('exported function already denies anonymous calls before returning user data', async () => {
        await asRole('anon', {}, () => assert.rejects(dashboard(), accessDenied));
    });
    await t.test('exported function already denies ordinary signed-in accounts', async () => {
        await asRole('authenticated', { email: userEmail }, () => assert.rejects(dashboard(), accessDenied));
    });
    await t.test('migration is repeatable and preserves the function body', async () => {
        const before = (await db.query("select prosrc from pg_proc where proname='get_admin_dashboard_stats'")).rows[0].prosrc;
        await db.exec(migration);
        await db.exec(migration);
        const after = (await db.query("select prosrc, proconfig from pg_proc where proname='get_admin_dashboard_stats'")).rows[0];
        assert.equal(after.prosrc, before);
        assert.deepEqual(after.proconfig, ['search_path=""']);
    });
    await t.test('anonymous execution is rejected at the permission boundary', async () => {
        await asRole('anon', {}, () => assert.rejects(dashboard(), permissionDenied));
    });
    await t.test('ordinary signed-in accounts remain blocked by internal authorization', async () => {
        await asRole('authenticated', { email: userEmail }, () => assert.rejects(dashboard(), accessDenied));
        await asRole('authenticated', {}, () => assert.rejects(dashboard(), accessDenied));
    });
    await t.test('editable user metadata does not confer administrator access', async () => {
        const claims = { email: userEmail, user_metadata: { email: adminEmail, role: 'admin' } };
        await asRole('authenticated', claims, () => assert.rejects(dashboard(), accessDenied));
    });
    await t.test('client accounts cannot read or change the administrator list', async () => {
        for (const [role, claims] of [['anon', {}], ['authenticated', { email: userEmail }], ['authenticated', { email: adminEmail }]]) {
            await asRole(role, claims, async () => {
                for (const sql of [
                    'select email from public.admin_users',
                    "insert into public.admin_users (email) values ('intruder@example.test')",
                    "update public.admin_users set email='intruder@example.test'",
                    'delete from public.admin_users',
                    'truncate public.admin_users',
                ]) await assert.rejects(db.query(sql), permissionDenied);
            });
        }
    });
    await t.test('existing administrator still receives the dashboard with accurate counts', async () => {
        const result = await asRole('authenticated', { email: adminEmail }, dashboard);
        assert.equal(result.rows.length, 2);
        assert.equal(Number(result.rows.find(row => row.email === userEmail).analysis_count), 1);
        assert.equal(Number(result.rows.find(row => row.email === adminEmail).analysis_count), 0);
        assert.equal((await db.query('select email from public.admin_users')).rows[0].email, adminEmail);
    });
    await t.test('privileged server retains its existing administrator-list access', async () => {
        await asRole('service_role', {}, async () => {
            assert.equal((await db.query('select email from public.admin_users')).rows.length, 1);
        });
    });
    await t.test('revoked administrator immediately loses dashboard access', async () => {
        await db.query('delete from public.admin_users where email=$1', [adminEmail]);
        await asRole('authenticated', { email: adminEmail }, () => assert.rejects(dashboard(), accessDenied));
    });
});
