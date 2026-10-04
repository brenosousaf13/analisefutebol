-- Synthetic test database: schema/policies observed on 03/10/2026.

-- Contains no production records, credentials or administrative function.

create role anon;

create role authenticated;

create schema auth;

create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema public, auth to anon, authenticated;

create table public."analyses" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "fixture_id" integer,
  "home_team_name" text not null,
  "away_team_name" text not null,
  "home_team_logo" text,
  "away_team_logo" text,
  "home_score" integer,
  "away_score" integer,
  "match_minute" character varying,
  "home_notes" text,
  "away_notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "titulo" character varying,
  "descricao" text,
  "tipo" character varying default 'partida'::character varying,
  "status" character varying default 'rascunho'::character varying,
  "thumbnail_url" character varying,
  "ultimo_acesso" timestamp with time zone default now(),
  "notas_casa" text,
  "notas_visitante" text,
  "notas_casa_updated_at" timestamp with time zone,
  "notas_visitante_updated_at" timestamp with time zone,
  "events" jsonb default '[]'::jsonb,
  "defensive_notes" text,
  "offensive_notes" text,
  "home_team_color" text default '#EF4444'::text,
  "away_team_color" text default '#3B82F6'::text,
  "home_defensive_notes" text,
  "home_offensive_notes" text,
  "home_bench_notes" text,
  "away_defensive_notes" text,
  "away_offensive_notes" text,
  "away_bench_notes" text,
  "match_date" date,
  "match_time" time without time zone,
  "home_coach" text,
  "away_coach" text,
  "share_token" uuid,
  "home_ball_def" jsonb,
  "home_ball_off" jsonb,
  "away_ball_def" jsonb,
  "away_ball_off" jsonb,
  "tags" text[],
  "home_team_bg_color" text default '#090909'::text,
  "away_team_bg_color" text default '#090909'::text,
  "competition" text,
  "home_note_html" text,
  "away_note_html" text
);

alter table public."analyses" add constraint "analyses_pkey" PRIMARY KEY (id);

alter table public."analyses" add constraint "analyses_share_token_key" UNIQUE (share_token);

alter table public."analyses" enable row level security;

grant all on public."analyses" to anon, authenticated;

create policy "Public read access for shared analyses" on public."analyses" as PERMISSIVE for SELECT to public using ((share_token IS NOT NULL));

create policy "Users can manage own analyses" on public."analyses" as PERMISSIVE for ALL to "authenticated" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

create table public."analysis_boards" (
  "id" uuid not null default gen_random_uuid(),
  "analysis_id" uuid,
  "title" text not null,
  "created_at" timestamp with time zone default now(),
  "order" integer default 0
);

alter table public."analysis_boards" add constraint "analysis_boards_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE;

alter table public."analysis_boards" add constraint "analysis_boards_pkey" PRIMARY KEY (id);

alter table public."analysis_boards" enable row level security;

grant all on public."analysis_boards" to anon, authenticated;

create policy "Public read access for boards of shared analyses" on public."analysis_boards" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_boards.analysis_id) AND (analyses.share_token IS NOT NULL)))));

create policy "Users can manage boards for their own analyses" on public."analysis_boards" as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_boards.analysis_id) AND (analyses.user_id = auth.uid())))));

create table public."analysis_players" (
  "id" uuid not null default gen_random_uuid(),
  "analysis_id" uuid,
  "player_id" bigint,
  "name" text not null,
  "number" integer,
  "team" text,
  "type" text,
  "x" double precision not null,
  "y" double precision not null,
  "note" text,
  "is_manual" boolean default false,
  "variant" text default 'defensive'::text,
  "board_id" uuid
);

alter table public."analysis_players" add constraint "analysis_players_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE;

alter table public."analysis_players" add constraint "analysis_players_board_id_fkey" FOREIGN KEY (board_id) REFERENCES analysis_boards(id) ON DELETE CASCADE;

alter table public."analysis_players" add constraint "analysis_players_pkey" PRIMARY KEY (id);

alter table public."analysis_players" add constraint "analysis_players_team_check" CHECK ((team = ANY (ARRAY['home'::text, 'away'::text])));

alter table public."analysis_players" add constraint "analysis_players_type_check" CHECK ((type = ANY (ARRAY['field'::text, 'bench'::text])));

alter table public."analysis_players" add constraint "analysis_players_variant_check" CHECK ((variant = ANY (ARRAY['defensive'::text, 'offensive'::text])));

alter table public."analysis_players" enable row level security;

grant all on public."analysis_players" to anon, authenticated;

create policy "Public read access for shared analysis players" on public."analysis_players" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_players.analysis_id) AND (analyses.share_token IS NOT NULL)))));

create policy "Users can manage own analysis players" on public."analysis_players" as PERMISSIVE for ALL to "authenticated" using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_players.analysis_id) AND (analyses.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_players.analysis_id) AND (analyses.user_id = auth.uid())))));

create table public."analysis_arrows" (
  "id" uuid not null default gen_random_uuid(),
  "analysis_id" uuid,
  "team" text,
  "start_x" double precision not null,
  "start_y" double precision not null,
  "end_x" double precision not null,
  "end_y" double precision not null,
  "color" text not null,
  "type" text,
  "variant" text default 'defensive'::text,
  "board_id" uuid
);

alter table public."analysis_arrows" add constraint "analysis_arrows_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE;

alter table public."analysis_arrows" add constraint "analysis_arrows_board_id_fkey" FOREIGN KEY (board_id) REFERENCES analysis_boards(id) ON DELETE CASCADE;

alter table public."analysis_arrows" add constraint "analysis_arrows_pkey" PRIMARY KEY (id);

alter table public."analysis_arrows" add constraint "analysis_arrows_team_check" CHECK ((team = ANY (ARRAY['home'::text, 'away'::text])));

alter table public."analysis_arrows" add constraint "analysis_arrows_variant_check" CHECK ((variant = ANY (ARRAY['defensive'::text, 'offensive'::text])));

alter table public."analysis_arrows" enable row level security;

grant all on public."analysis_arrows" to anon, authenticated;

create policy "Public read access for shared analysis arrows" on public."analysis_arrows" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_arrows.analysis_id) AND (analyses.share_token IS NOT NULL)))));

create policy "Users can manage own analysis arrows" on public."analysis_arrows" as PERMISSIVE for ALL to "authenticated" using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_arrows.analysis_id) AND (analyses.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_arrows.analysis_id) AND (analyses.user_id = auth.uid())))));

create table public."analysis_rectangles" (
  "id" uuid not null default gen_random_uuid(),
  "analysis_id" uuid not null,
  "team" text not null,
  "variant" text not null,
  "start_x" numeric not null,
  "start_y" numeric not null,
  "end_x" numeric not null,
  "end_y" numeric not null,
  "color" text not null,
  "opacity" numeric not null default 0.5,
  "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
  "board_id" uuid
);

alter table public."analysis_rectangles" add constraint "analysis_rectangles_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE;

alter table public."analysis_rectangles" add constraint "analysis_rectangles_board_id_fkey" FOREIGN KEY (board_id) REFERENCES analysis_boards(id) ON DELETE CASCADE;

alter table public."analysis_rectangles" add constraint "analysis_rectangles_pkey" PRIMARY KEY (id);

alter table public."analysis_rectangles" add constraint "analysis_rectangles_team_check" CHECK ((team = ANY (ARRAY['home'::text, 'away'::text])));

alter table public."analysis_rectangles" add constraint "analysis_rectangles_variant_check" CHECK ((variant = ANY (ARRAY['defensive'::text, 'offensive'::text])));

alter table public."analysis_rectangles" enable row level security;

grant all on public."analysis_rectangles" to anon, authenticated;

create policy "Public read access for shared analysis rectangles" on public."analysis_rectangles" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_rectangles.analysis_id) AND (analyses.share_token IS NOT NULL)))));

create policy "Users can delete their own analysis rectangles" on public."analysis_rectangles" as PERMISSIVE for DELETE to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_rectangles.analysis_id) AND (analyses.user_id = auth.uid())))));

create policy "Users can insert their own analysis rectangles" on public."analysis_rectangles" as PERMISSIVE for INSERT to public with check ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_rectangles.analysis_id) AND (analyses.user_id = auth.uid())))));

create policy "Users can update their own analysis rectangles" on public."analysis_rectangles" as PERMISSIVE for UPDATE to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_rectangles.analysis_id) AND (analyses.user_id = auth.uid())))));

create policy "Users can view their own analysis rectangles" on public."analysis_rectangles" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_rectangles.analysis_id) AND (analyses.user_id = auth.uid())))));

create table public."analysis_tags" (
  "id" uuid not null default gen_random_uuid(),
  "analysis_id" uuid,
  "tag_value" text not null,
  "tag_type" text
);

alter table public."analysis_tags" add constraint "analysis_tags_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE;

alter table public."analysis_tags" add constraint "analysis_tags_pkey" PRIMARY KEY (id);

alter table public."analysis_tags" add constraint "analysis_tags_tag_type_check" CHECK ((tag_type = ANY (ARRAY['player'::text, 'team'::text, 'coach'::text, 'other'::text])));

alter table public."analysis_tags" enable row level security;

grant all on public."analysis_tags" to anon, authenticated;

create policy "Public read access for shared analysis tags" on public."analysis_tags" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_tags.analysis_id) AND (analyses.share_token IS NOT NULL)))));

create policy "Users can manage own analysis tags" on public."analysis_tags" as PERMISSIVE for ALL to "authenticated" using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_tags.analysis_id) AND (analyses.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_tags.analysis_id) AND (analyses.user_id = auth.uid())))));

create table public."analysis_field_texts" (
  "id" uuid not null default gen_random_uuid(),
  "analysis_id" uuid not null,
  "board_id" uuid,
  "team" text not null,
  "variant" text not null,
  "x" numeric not null,
  "y" numeric not null,
  "content" text not null,
  "color" text not null default '#FFFFFF'::text,
  "font_size" numeric not null default 14,
  "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public."analysis_field_texts" add constraint "analysis_field_texts_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE;

alter table public."analysis_field_texts" add constraint "analysis_field_texts_board_id_fkey" FOREIGN KEY (board_id) REFERENCES analysis_boards(id) ON DELETE CASCADE;

alter table public."analysis_field_texts" add constraint "analysis_field_texts_pkey" PRIMARY KEY (id);

alter table public."analysis_field_texts" add constraint "analysis_field_texts_team_check" CHECK ((team = ANY (ARRAY['home'::text, 'away'::text])));

alter table public."analysis_field_texts" add constraint "analysis_field_texts_variant_check" CHECK ((variant = ANY (ARRAY['defensive'::text, 'offensive'::text])));

alter table public."analysis_field_texts" enable row level security;

grant all on public."analysis_field_texts" to anon, authenticated;

create policy "Shared analyses expose field texts" on public."analysis_field_texts" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_field_texts.analysis_id) AND (analyses.share_token IS NOT NULL)))));

create policy "Users can delete their own analysis field texts" on public."analysis_field_texts" as PERMISSIVE for DELETE to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_field_texts.analysis_id) AND (analyses.user_id = auth.uid())))));

create policy "Users can insert their own analysis field texts" on public."analysis_field_texts" as PERMISSIVE for INSERT to public with check ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_field_texts.analysis_id) AND (analyses.user_id = auth.uid())))));

create policy "Users can update their own analysis field texts" on public."analysis_field_texts" as PERMISSIVE for UPDATE to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_field_texts.analysis_id) AND (analyses.user_id = auth.uid())))));

create policy "Users can view their own analysis field texts" on public."analysis_field_texts" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM analyses
  WHERE ((analyses.id = analysis_field_texts.analysis_id) AND (analyses.user_id = auth.uid())))));
