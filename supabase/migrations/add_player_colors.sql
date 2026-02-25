-- Adicionar colunas de cor individual para os jogadores
ALTER TABLE analysis_players
ADD COLUMN IF NOT EXISTS background_color TEXT,
ADD COLUMN IF NOT EXISTS border_color TEXT;
