-- Adicionar colunas globais de cor de fundo da equipe na tabela analyses
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS home_team_bg_color TEXT,
ADD COLUMN IF NOT EXISTS away_team_bg_color TEXT;

-- Opcional (se você tiver dados antigos na tabela analysis_players baseados no commit anterior, você pode remover ou deixar lá)
-- ALTER TABLE analysis_players DROP COLUMN background_color;
-- ALTER TABLE analysis_players DROP COLUMN border_color;
