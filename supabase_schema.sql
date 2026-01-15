-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: analyses
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Mock User ID for now
    fixture_id INTEGER,
    home_team_name TEXT NOT NULL,
    away_team_name TEXT NOT NULL,
    home_team_logo TEXT,
    away_team_logo TEXT,
    home_score INTEGER,
    away_score INTEGER,
    match_minute VARCHAR(10),
    home_notes TEXT,
    home_off_notes TEXT,
    away_notes TEXT,
    away_off_notes TEXT,
    game_notes TEXT,
    notas_casa TEXT,
    notas_casa_updated_at TIMESTAMP WITH TIME ZONE,
    notas_visitante TEXT,
    notas_visitante_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: analysis_players
CREATE TABLE IF NOT EXISTS analysis_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL, -- API ID or timestamp for manual
    name TEXT NOT NULL,
    number INTEGER,
    team TEXT CHECK (team IN ('home', 'away')),
    type TEXT CHECK (type IN ('field', 'bench')),
    variant TEXT CHECK (variant IN ('defensive', 'offensive')) DEFAULT 'defensive',
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    note TEXT,
    is_manual BOOLEAN DEFAULT FALSE
);

-- Table: analysis_arrows
CREATE TABLE IF NOT EXISTS analysis_arrows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    team TEXT CHECK (team IN ('home', 'away')),
    variant TEXT CHECK (variant IN ('defensive', 'offensive')) DEFAULT 'defensive',
    start_x FLOAT NOT NULL,
    start_y FLOAT NOT NULL,
    end_x FLOAT NOT NULL,
    end_y FLOAT NOT NULL,
    color TEXT NOT NULL,
    type TEXT -- 'straight', 'curved', etc. if needed later
);

-- Table: analysis_tags (for search)
CREATE TABLE IF NOT EXISTS analysis_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    tag_value TEXT NOT NULL,
    tag_type TEXT CHECK (tag_type IN ('player', 'team', 'coach', 'other'))
);

-- Index for searching tags
CREATE INDEX IF NOT EXISTS idx_analysis_tags_value ON analysis_tags(tag_value);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);

-- Table: match_events
CREATE TABLE IF NOT EXISTS match_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('goal', 'yellow_card', 'red_card', 'substitution', 'interval', 'start', 'end', 'var', 'injury')),
    minute INTEGER NOT NULL,
    minute_extra INTEGER DEFAULT 0,
    team TEXT CHECK (team IN ('home', 'away')),
    player_id INTEGER, -- ID of the primary player involved
    player_name TEXT,
    secondary_player_id INTEGER, -- Assist or player coming IN
    secondary_player_name TEXT,
    details JSONB, -- For specific details like 'autogoal', 'penalty', reasoning
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
