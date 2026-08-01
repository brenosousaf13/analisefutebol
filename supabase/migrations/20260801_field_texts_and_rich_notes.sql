-- ============================================================================
-- 1) Textos soltos desenhados no campinho
-- ============================================================================
-- Mesma estrutura de analysis_arrows / analysis_rectangles: pertencem a uma
-- analise, opcionalmente a um board, e sao identificados por time + fase.
-- O ciclo de vida tambem e igual: saveAnalysis apaga tudo da analise e reinsere.

create table if not exists analysis_field_texts (
  id uuid default gen_random_uuid() primary key,
  analysis_id uuid references analyses(id) on delete cascade not null,
  board_id uuid references analysis_boards(id) on delete cascade,
  team text not null check (team in ('home', 'away')),
  variant text not null check (variant in ('defensive', 'offensive')),
  x numeric not null,
  y numeric not null,
  content text not null,
  color text not null default '#FFFFFF',
  font_size numeric not null default 14,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table analysis_field_texts enable row level security;

drop policy if exists "Users can view their own analysis field texts" on analysis_field_texts;
create policy "Users can view their own analysis field texts"
  on analysis_field_texts for select
  using ( exists ( select 1 from analyses where id = analysis_field_texts.analysis_id and user_id = auth.uid() ) );

drop policy if exists "Users can insert their own analysis field texts" on analysis_field_texts;
create policy "Users can insert their own analysis field texts"
  on analysis_field_texts for insert
  with check ( exists ( select 1 from analyses where id = analysis_field_texts.analysis_id and user_id = auth.uid() ) );

drop policy if exists "Users can update their own analysis field texts" on analysis_field_texts;
create policy "Users can update their own analysis field texts"
  on analysis_field_texts for update
  using ( exists ( select 1 from analyses where id = analysis_field_texts.analysis_id and user_id = auth.uid() ) );

drop policy if exists "Users can delete their own analysis field texts" on analysis_field_texts;
create policy "Users can delete their own analysis field texts"
  on analysis_field_texts for delete
  using ( exists ( select 1 from analyses where id = analysis_field_texts.analysis_id and user_id = auth.uid() ) );

-- Leitura publica das analises compartilhadas por token, igual as outras tabelas.
drop policy if exists "Shared analyses expose field texts" on analysis_field_texts;
create policy "Shared analyses expose field texts"
  on analysis_field_texts for select
  using ( exists ( select 1 from analyses where id = analysis_field_texts.analysis_id and share_token is not null ) );


-- ============================================================================
-- 2) Anotacao unica por time, com formatacao (rich text)
-- ============================================================================
-- Colunas NOVAS, de proposito: as antigas (home_defensive_notes,
-- home_offensive_notes e equivalentes do visitante) continuam intactas.
-- Analises novas passam a escrever aqui; as antigas serao migradas depois,
-- manualmente. Guarda HTML sanitizado.

alter table analyses add column if not exists home_note_html text;
alter table analyses add column if not exists away_note_html text;
