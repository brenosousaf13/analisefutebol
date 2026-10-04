-- Etapa 1: preparar a leitura por token, antes de atualizar o aplicativo.
-- Esta etapa mantém as policies atuais para que os links antigos continuem
-- funcionando. A etapa 2 só deve ser aplicada após publicar o novo leitor.
begin;

create or replace function public.get_shared_analysis_v1(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'analysis', jsonb_build_object(
      'id', a.id, 'fixture_id', a.fixture_id,
      'match_date', a.match_date, 'match_time', a.match_time,
      'titulo', a.titulo, 'descricao', a.descricao, 'tipo', a.tipo, 'status', a.status,
      'competition', a.competition,
      'home_team_name', a.home_team_name, 'away_team_name', a.away_team_name,
      'home_team_logo', a.home_team_logo, 'away_team_logo', a.away_team_logo,
      'home_score', a.home_score, 'away_score', a.away_score,
      'home_team_color', a.home_team_color, 'away_team_color', a.away_team_color,
      'home_team_bg_color', a.home_team_bg_color, 'away_team_bg_color', a.away_team_bg_color,
      'home_coach', a.home_coach, 'away_coach', a.away_coach,
      'notas_casa', a.notas_casa, 'notas_visitante', a.notas_visitante,
      'notas_casa_updated_at', a.notas_casa_updated_at,
      'notas_visitante_updated_at', a.notas_visitante_updated_at,
      'home_defensive_notes', a.home_defensive_notes,
      'home_offensive_notes', a.home_offensive_notes, 'home_bench_notes', a.home_bench_notes,
      'away_defensive_notes', a.away_defensive_notes,
      'away_offensive_notes', a.away_offensive_notes, 'away_bench_notes', a.away_bench_notes,
      'home_note_html', a.home_note_html, 'away_note_html', a.away_note_html,
      'defensive_notes', a.defensive_notes, 'offensive_notes', a.offensive_notes,
      'home_ball_def', a.home_ball_def, 'home_ball_off', a.home_ball_off,
      'away_ball_def', a.away_ball_def, 'away_ball_off', a.away_ball_off,
      'events', a.events, 'tags', a.tags
    ),
    'boards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'title', b.title, 'order', b."order"
      ) order by b."order", b.id)
      from public.analysis_boards b where b.analysis_id = a.id
    ), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'board_id', p.board_id, 'player_id', p.player_id,
        'name', p.name, 'number', p.number, 'team', p.team, 'type', p.type,
        'variant', p.variant, 'x', p.x, 'y', p.y, 'note', p.note, 'is_manual', p.is_manual
      ) order by p.id)
      from public.analysis_players p where p.analysis_id = a.id
    ), '[]'::jsonb),
    'arrows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'board_id', d.board_id, 'team', d.team, 'variant', d.variant,
        'start_x', d.start_x, 'start_y', d.start_y,
        'end_x', d.end_x, 'end_y', d.end_y, 'color', d.color
      ) order by d.id)
      from public.analysis_arrows d where d.analysis_id = a.id
    ), '[]'::jsonb),
    'rectangles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'board_id', d.board_id, 'team', d.team, 'variant', d.variant,
        'start_x', d.start_x, 'start_y', d.start_y,
        'end_x', d.end_x, 'end_y', d.end_y, 'color', d.color, 'opacity', d.opacity
      ) order by d.id)
      from public.analysis_rectangles d where d.analysis_id = a.id
    ), '[]'::jsonb),
    'field_texts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'board_id', t.board_id, 'team', t.team, 'variant', t.variant,
        'x', t.x, 'y', t.y, 'content', t.content, 'color', t.color, 'font_size', t.font_size
      ) order by t.id)
      from public.analysis_field_texts t where t.analysis_id = a.id
    ), '[]'::jsonb)
  )
  from public.analyses a
  where a.share_token = p_token;
$function$;

revoke all on function public.get_shared_analysis_v1(uuid) from public, anon, authenticated;
grant execute on function public.get_shared_analysis_v1(uuid) to anon, authenticated;
comment on function public.get_shared_analysis_v1(uuid) is
  'Read-only public analysis view. Requires the exact share token; omits owner identity and access metadata.';

notify pgrst, 'reload schema';
commit;
