-- Core schema for match management (youth context)

-- Prerequisites
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
        CREATE TYPE event_type AS ENUM (
            'goal','pen_goal','own_goal',
            'yellow','second_yellow','red',
            'sub_on','sub_off'
        );
    END IF;
END$$;

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT
);

-- Competitions
CREATE TABLE IF NOT EXISTS competitions (
    competition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    season TEXT
);

-- Venues
CREATE TABLE IF NOT EXISTS venues (
    venue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT
);

-- Players (identity via national_id)
CREATE TABLE IF NOT EXISTS players (
    player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    national_id TEXT NOT NULL UNIQUE,
    birthdate DATE,
    current_team_id UUID REFERENCES teams(team_id),
    position TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(competition_id),
    match_date TIMESTAMPTZ NOT NULL,
    venue_id UUID REFERENCES venues(venue_id),
    category TEXT,
    home_team_id UUID NOT NULL REFERENCES teams(team_id),
    away_team_id UUID NOT NULL REFERENCES teams(team_id),
    result_home INT NOT NULL DEFAULT 0,
    result_away INT NOT NULL DEFAULT 0,
    youtube_link TEXT,
    notes TEXT,
    source_pdf_hash TEXT,         -- for idempotent upload
    parse_confidence REAL         -- 0..1
);

-- Ensure idempotency on non-null source_pdf_hash
CREATE UNIQUE INDEX IF NOT EXISTS uq_matches_source_pdf_hash
    ON matches(source_pdf_hash)
    WHERE source_pdf_hash IS NOT NULL;

-- Match players (lineup + bench)
CREATE TABLE IF NOT EXISTS match_players (
    match_player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(team_id),
    player_id UUID NOT NULL REFERENCES players(player_id),
    role TEXT NOT NULL CHECK (role IN ('starter','sub')),
    position TEXT,
    jersey_number INT,
    UNIQUE (match_id, player_id)
);

-- Events
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(team_id),
    player_id UUID REFERENCES players(player_id), -- NULL allowed for own_goal/unknown
    related_player_id UUID REFERENCES players(player_id), -- for subs (on/off pair)
    minute INT NOT NULL CHECK (minute BETWEEN 0 AND 120),
    added_time INT CHECK (added_time BETWEEN 0 AND 15),
    type event_type NOT NULL,
    assist_player_id UUID REFERENCES players(player_id),
    reason TEXT,
    data_json JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_match ON events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);


