-- Add game_notes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyses' AND column_name = 'game_notes') THEN
        ALTER TABLE analyses ADD COLUMN game_notes TEXT;
    END IF;
END $$;
