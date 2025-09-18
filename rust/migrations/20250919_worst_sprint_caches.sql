-- Cache tables for worst cases and sprints-in-worst-cases per match (table/view)

-- Per-player worst 1-minute HSR window within a match/view
CREATE TABLE IF NOT EXISTS player_worst_cases_cache (
  match_name              TEXT NOT NULL,
  player_display_name     TEXT NOT NULL,
  start_second            DOUBLE PRECISION,
  end_second              DOUBLE PRECISION,
  distance_covered        DOUBLE PRECISION,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_name, player_display_name)
);

CREATE INDEX IF NOT EXISTS idx_pwc_match_name ON player_worst_cases_cache (match_name);

-- Sprints that occur within each player's worst-case window
CREATE TABLE IF NOT EXISTS sprints_in_worst_cases_cache (
  match_name                       TEXT NOT NULL,
  player_display_name              TEXT NOT NULL,
  sprint_start_time                TEXT,
  sprint_end_time                  TEXT,
  sprint_start_sec                 DOUBLE PRECISION,
  sprint_end_sec                   DOUBLE PRECISION,
  total_sprint_distance            DOUBLE PRECISION,
  min_speed_reached_within_sprint  DOUBLE PRECISION,
  max_speed_reached_within_sprint  DOUBLE PRECISION,
  worst_case_start_second          DOUBLE PRECISION,
  worst_case_end_second            DOUBLE PRECISION,
  worst_case_distance_covered      DOUBLE PRECISION,
  created_at                       TIMESTAMPTZ DEFAULT NOW(),
  updated_at                       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_name, player_display_name, sprint_start_sec, sprint_end_sec)
);

CREATE INDEX IF NOT EXISTS idx_siwc_match_name ON sprints_in_worst_cases_cache (match_name);


