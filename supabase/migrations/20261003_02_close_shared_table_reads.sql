-- Etapa 2: aplicar somente depois de publicar o aplicativo que usa
-- get_shared_analysis_v1. A etapa 1 isolada ainda não fecha a listagem.
-- Mantém tokens, dados e as policies de gestão do proprietário.
begin;

do $check$
begin
  if to_regprocedure('public.get_shared_analysis_v1(uuid)') is null then
    raise exception 'Aplique primeiro 20261003_01_shared_analysis_rpc.sql.';
  end if;
end;
$check$;

drop policy if exists "Public read access for shared analyses" on public.analyses;
drop policy if exists "Public read access for shared analysis players" on public.analysis_players;
drop policy if exists "Public read access for shared analysis arrows" on public.analysis_arrows;
drop policy if exists "Public read access for shared analysis rectangles" on public.analysis_rectangles;
drop policy if exists "Public read access for shared analysis tags" on public.analysis_tags;
drop policy if exists "Public read access for boards of shared analyses" on public.analysis_boards;
drop policy if exists "Shared analyses expose field texts" on public.analysis_field_texts;

-- As policies são a proteção por usuário. Os grants abaixo também retiram
-- privilégios desnecessários, como TRUNCATE, que não é protegido por RLS.
revoke all on table
  public.analyses, public.analysis_boards, public.analysis_players,
  public.analysis_arrows, public.analysis_rectangles, public.analysis_tags,
  public.analysis_field_texts
from public, anon, authenticated;
grant select, insert, update, delete on table
  public.analyses, public.analysis_boards, public.analysis_players,
  public.analysis_arrows, public.analysis_rectangles, public.analysis_tags,
  public.analysis_field_texts
to authenticated;

notify pgrst, 'reload schema';
commit;
