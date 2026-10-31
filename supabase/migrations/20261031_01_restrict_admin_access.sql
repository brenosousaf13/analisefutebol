-- Restringe o acesso ao painel administrativo sem reescrever sua função.
-- A autorização interna continua usando public.admin_users e auth.jwt().
-- Não altera cadastros, análises ou a lista de administradores existente.
begin;

-- A função SECURITY DEFINER acessa tabelas com schemas explícitos.
alter function public.get_admin_dashboard_stats() set search_path = '';
revoke execute on function public.get_admin_dashboard_stats() from public, anon;
grant execute on function public.get_admin_dashboard_stats() to authenticated;

-- Somente o banco/servidor gerencia a lista que autoriza os administradores.
-- Usuários do app, inclusive administradores, consultam o painel pela função.
revoke all privileges on table public.admin_users from public, anon, authenticated;
-- Cobre também possíveis grants concedidos diretamente à coluna de autorização.
revoke all privileges (email) on table public.admin_users from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
