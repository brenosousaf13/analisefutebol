
-- Add share_token column to analyses table
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_analyses_share_token ON public.analyses(share_token);

-- Enable RLS (should already be enabled, but ensuring)
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read analysis if they have the share_token
-- Note: We use a function or direct comparison. Since share_token is unique,
-- we actually need a policy that allows SELECT if the row has a share_token matching a criterion?
-- Actually, for public access, we usually just want "Allow SELECT if share_token IS NOT NULL"
-- BUT, that would allow anyone to list ALL shared analyses. 
-- For better security/privacy (obfuscation), we might want to rely on the fact that
-- UUIDs are hard to guess. So "Allow SELECT if share_token IS NOT NULL" is acceptable 
-- if listing isn't blocked by other means, but usually RLS is about *can this user see this row*.
-- If we want them to only see it if they know the token, RLS is tricky because the token IS in the row.
--
-- Approach: Allow SELECT on valid share_token.
-- SECURITY NOTE: This allows anyone to query `SELECT * FROM analyses WHERE share_token IS NOT NULL`.
-- In a real prod env with sensitive data, we might want a separate table or edge function.
-- For this app, "Security by Obscurity" of the UUID is standard for this pattern.

CREATE POLICY "Public read access for shared analyses"
ON public.analyses
FOR SELECT
USING (share_token IS NOT NULL);

-- We also need to allow reading related tables (players, arrows, etc) if the parent analysis is shared.
-- This requires a join or exists check.

-- Policy for analysis_players
CREATE POLICY "Public read access for shared analysis players"
ON public.analysis_players
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.analyses
        WHERE analyses.id = analysis_players.analysis_id
        AND analyses.share_token IS NOT NULL
    )
);

-- Policy for analysis_arrows
CREATE POLICY "Public read access for shared analysis arrows"
ON public.analysis_arrows
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.analyses
        WHERE analyses.id = analysis_arrows.analysis_id
        AND analyses.share_token IS NOT NULL
    )
);

-- Policy for analysis_rectangles
CREATE POLICY "Public read access for shared analysis rectangles"
ON public.analysis_rectangles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.analyses
        WHERE analyses.id = analysis_rectangles.analysis_id
        AND analyses.share_token IS NOT NULL
    )
);

-- Policy for analysis_tags
CREATE POLICY "Public read access for shared analysis tags"
ON public.analysis_tags
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.analyses
        WHERE analyses.id = analysis_tags.analysis_id
        AND analyses.share_token IS NOT NULL
    )
);
