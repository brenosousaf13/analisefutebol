-- Uma chamada salva o estado completo. Qualquer erro desfaz toda a chamada.
-- Executar antes de publicar o aplicativo que usa save_analysis_v1.
-- Não altera a estrutura das tabelas nem migra análises existentes.
begin;

create or replace function public.save_analysis_v1(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_old public.analyses%rowtype;
  v_next public.analyses%rowtype;
  v_changes jsonb;
  v_key text;
  v_board record;
  v_count integer;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'Sessão expirada. Entre novamente para salvar.';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object'
     or jsonb_typeof(p_payload->'analysis') is distinct from 'object'
     or jsonb_typeof(p_payload->'is_new') is distinct from 'boolean' then
    raise exception using errcode = '22023', message = 'Estado da análise inválido.';
  end if;
  foreach v_key in array array['boards', 'players', 'arrows', 'rectangles'] loop
    if jsonb_typeof(p_payload->v_key) is distinct from 'array' then
      raise exception using errcode = '22023', message = 'Estado incompleto: ' || v_key;
    end if;
  end loop;
  v_id := (p_payload->>'id')::uuid;
  if v_id is null then
    raise exception using errcode = '22023', message = 'Identificador de análise ausente.';
  end if;

  if (p_payload->>'is_new')::boolean then
    insert into public.analyses (id, user_id, home_team_name, away_team_name)
    values (v_id, v_uid, p_payload->'analysis'->>'home_team_name', p_payload->'analysis'->>'away_team_name')
    returning * into v_old;
  else
    -- Serializa os salvamentos dessa análise; RLS e a verificação de proprietário
    -- continuam valendo. Uma análise inexistente não é recriada silenciosamente.
    select * into v_old from public.analyses
    where id = v_id and user_id = v_uid for update;
    if not found then
      raise exception using errcode = '42501', message = 'Análise indisponível para edição.';
    end if;
  end if;

  -- Atualiza apenas os campos gerenciados pelo editor. Campos omitidos mantêm
  -- seu valor, inclusive notas antigas. Propriedade, token e criação não vêm do cliente.
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_changes
  from jsonb_each(p_payload->'analysis')
  where key = any (array['fixture_id', 'match_date', 'match_time', 'titulo', 'descricao', 'tipo', 'status', 'competition', 'home_team_name', 'away_team_name', 'home_team_logo', 'away_team_logo', 'home_score', 'away_score', 'home_team_color', 'away_team_color', 'home_team_bg_color', 'away_team_bg_color', 'notas_casa', 'notas_visitante', 'notas_casa_updated_at', 'notas_visitante_updated_at', 'home_defensive_notes', 'home_offensive_notes', 'home_bench_notes', 'away_defensive_notes', 'away_offensive_notes', 'away_bench_notes', 'home_note_html', 'away_note_html', 'defensive_notes', 'offensive_notes', 'home_coach', 'away_coach', 'home_ball_def', 'home_ball_off', 'away_ball_def', 'away_ball_off', 'events', 'tags']);
  if v_changes ? 'events' then
    if jsonb_typeof(v_changes->'events') is distinct from 'array' then
      raise exception using errcode = '22023', message = 'Eventos inválidos.';
    end if;
    -- O editor antigo oculta os eventos _meta. Preserva seus vídeos ao salvar.
    if not exists (select 1 from jsonb_array_elements(v_changes->'events') e where e->>'type' = '_meta') then
      v_changes := jsonb_set(v_changes, '{events}', (v_changes->'events') || coalesce((
        select jsonb_agg(e) from jsonb_array_elements(coalesce(v_old.events, '[]'::jsonb)) e
        where e->>'type' = '_meta'
      ), '[]'::jsonb));
    end if;
  end if;
  v_next := jsonb_populate_record(v_old, v_changes);
  update public.analyses set
    fixture_id = v_next.fixture_id,
    match_date = v_next.match_date,
    match_time = v_next.match_time,
    titulo = v_next.titulo,
    descricao = v_next.descricao,
    tipo = v_next.tipo,
    status = v_next.status,
    competition = v_next.competition,
    home_team_name = v_next.home_team_name,
    away_team_name = v_next.away_team_name,
    home_team_logo = v_next.home_team_logo,
    away_team_logo = v_next.away_team_logo,
    home_score = v_next.home_score,
    away_score = v_next.away_score,
    home_team_color = v_next.home_team_color,
    away_team_color = v_next.away_team_color,
    home_team_bg_color = v_next.home_team_bg_color,
    away_team_bg_color = v_next.away_team_bg_color,
    notas_casa = v_next.notas_casa,
    notas_visitante = v_next.notas_visitante,
    notas_casa_updated_at = v_next.notas_casa_updated_at,
    notas_visitante_updated_at = v_next.notas_visitante_updated_at,
    home_defensive_notes = v_next.home_defensive_notes,
    home_offensive_notes = v_next.home_offensive_notes,
    home_bench_notes = v_next.home_bench_notes,
    away_defensive_notes = v_next.away_defensive_notes,
    away_offensive_notes = v_next.away_offensive_notes,
    away_bench_notes = v_next.away_bench_notes,
    home_note_html = v_next.home_note_html,
    away_note_html = v_next.away_note_html,
    defensive_notes = v_next.defensive_notes,
    offensive_notes = v_next.offensive_notes,
    home_coach = v_next.home_coach,
    away_coach = v_next.away_coach,
    home_ball_def = v_next.home_ball_def,
    home_ball_off = v_next.home_ball_off,
    away_ball_def = v_next.away_ball_def,
    away_ball_off = v_next.away_ball_off,
    events = v_next.events,
    tags = v_next.tags,
    updated_at = clock_timestamp()
  where id = v_id and user_id = v_uid;

  if exists (
    select 1 from jsonb_to_recordset(p_payload->'boards') as b(id uuid)
    group by b.id having b.id is null or count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'Cenas com identificação inválida ou repetida.';
  end if;
  -- Cada elemento só pode pertencer a uma cena incluída nesta mesma análise.
  foreach v_key in array array['players', 'arrows', 'rectangles'] loop
    if exists (
      select 1 from jsonb_to_recordset(p_payload->v_key) as i(board_id uuid)
      where i.board_id is not null and not exists (
        select 1 from jsonb_to_recordset(p_payload->'boards') as b(id uuid) where b.id = i.board_id
      )
    ) then
      raise exception using errcode = '22023', message = 'Elemento associado a uma cena inválida.';
    end if;
  end loop;

  -- Mantém IDs/created_at das cenas existentes e dados que o editor não gerencia
  -- (por exemplo, textos legados). Não associa cenas pela ordem de resposta.
  for v_board in select * from jsonb_to_recordset(p_payload->'boards') as b(id uuid, title text, "order" integer) loop
    insert into public.analysis_boards (id, analysis_id, title, "order")
    values (v_board.id, v_id, v_board.title, v_board."order")
    on conflict (id) do update set title = excluded.title, "order" = excluded."order"
    where public.analysis_boards.analysis_id = v_id;
    get diagnostics v_count = row_count;
    if v_count <> 1 then
      raise exception using errcode = '42501', message = 'Cena indisponível para edição.';
    end if;
  end loop;
  delete from public.analysis_boards b where b.analysis_id = v_id and not exists (
    select 1 from jsonb_to_recordset(p_payload->'boards') as wanted(id uuid) where wanted.id = b.id
  );
  delete from public.analysis_players where analysis_id = v_id;
  delete from public.analysis_arrows where analysis_id = v_id;
  delete from public.analysis_rectangles where analysis_id = v_id;

  insert into public.analysis_players
    (analysis_id, board_id, player_id, name, number, team, type, variant, x, y, note, is_manual)
  select v_id, p.board_id, p.player_id, p.name, p.number, p.team, p.type, p.variant, p.x, p.y, p.note, p.is_manual
  from jsonb_to_recordset(p_payload->'players') as p(
    board_id uuid, player_id bigint, name text, number integer, team text, type text,
    variant text, x double precision, y double precision, note text, is_manual boolean
  );
  insert into public.analysis_arrows
    (analysis_id, board_id, team, variant, start_x, start_y, end_x, end_y, color, type)
  select v_id, a.board_id, a.team, a.variant, a.start_x, a.start_y, a.end_x, a.end_y, a.color, 'arrow'
  from jsonb_to_recordset(p_payload->'arrows') as a(
    board_id uuid, team text, variant text, start_x double precision, start_y double precision,
    end_x double precision, end_y double precision, color text
  );
  insert into public.analysis_rectangles
    (analysis_id, board_id, team, variant, start_x, start_y, end_x, end_y, color, opacity)
  select v_id, r.board_id, r.team, r.variant, r.start_x, r.start_y, r.end_x, r.end_y, r.color, r.opacity
  from jsonb_to_recordset(p_payload->'rectangles') as r(
    board_id uuid, team text, variant text, start_x numeric, start_y numeric,
    end_x numeric, end_y numeric, color text, opacity numeric
  );
  return v_id;
end;
$function$;

revoke all on function public.save_analysis_v1(jsonb) from public, anon;
grant execute on function public.save_analysis_v1(jsonb) to authenticated;
comment on function public.save_analysis_v1(jsonb) is
  'Authenticated owner-only atomic save. Invoker RLS applies; errors roll back the whole call.';
notify pgrst, 'reload schema';
commit;
