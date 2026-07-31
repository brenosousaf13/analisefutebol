-- Campeonato da partida analisada.
-- Exibido na coluna "Campeonato" da lista de Ultimas analises na Home e
-- preenchido automaticamente quando a analise nasce de um jogo da API-Football.
--
-- O app funciona sem esta coluna: analysisService detecta a ausencia e
-- refaz a consulta sem ela. Rodar esta migration apenas habilita o campo.

ALTER TABLE analyses ADD COLUMN IF NOT EXISTS competition TEXT;
