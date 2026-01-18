-- Add new columns for generic phase notes and team colors
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS defensive_notes TEXT,
ADD COLUMN IF NOT EXISTS offensive_notes TEXT,
ADD COLUMN IF NOT EXISTS home_team_color TEXT DEFAULT '#EF4444',
ADD COLUMN IF NOT EXISTS away_team_color TEXT DEFAULT '#3B82F6';
