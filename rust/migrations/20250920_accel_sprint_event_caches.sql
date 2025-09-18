-- Cache tables for acceleration summaries/events and sprint events per match/view

-- Acceleration summary per player (default mode)
CREATE TABLE IF NOT EXISTS acceleration_summary_cache (
  match_name                 TEXT NOT NULL,
  player_display_name        TEXT NOT NULL,
  total_accel_events         BIGINT,
  accel_low                  BIGINT,
  accel_medium               BIGINT,
  accel_high                 BIGINT,
  total_decel_events         BIGINT,
  decel_low                  BIGINT,
  decel_medium               BIGINT,
  decel_high                 BIGINT,
  total_distance_m           DOUBLE PRECISION,
  total_time_s               DOUBLE PRECISION,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_name, player_display_name)
);

CREATE INDEX IF NOT EXISTS idx_accsum_match_name ON acceleration_summary_cache (match_name);

-- Acceleration full events
CREATE TABLE IF NOT EXISTS acceleration_events_cache (
  match_name                 TEXT NOT NULL,
  player_display_name        TEXT NOT NULL,
  seconds_since_midnight     DOUBLE PRECISION,
  start_time                 TEXT,
  end_time                   TEXT,
  duration_s                 DOUBLE PRECISION,
  peak_acc                   DOUBLE PRECISION,
  max_speed_kph              DOUBLE PRECISION,
  distance_m                 DOUBLE PRECISION,
  accel_or_decel             TEXT,
  intensity_category         TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_name, player_display_name, seconds_since_midnight, start_time, end_time)
);

CREATE INDEX IF NOT EXISTS idx_accevents_match_name ON acceleration_events_cache (match_name);

-- Sprint events (full)
CREATE TABLE IF NOT EXISTS sprint_events_cache (
  match_name                 TEXT NOT NULL,
  player_display_name        TEXT NOT NULL,
  seconds_since_midnight     DOUBLE PRECISION,
  start_time                 TEXT,
  end_time                   TEXT,
  duration_s                 DOUBLE PRECISION,
  max_speed_kph              DOUBLE PRECISION,
  peak_acc_m_s2              DOUBLE PRECISION,
  distance_m                 DOUBLE PRECISION,
  intensity_category         TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_name, player_display_name, seconds_since_midnight, start_time, end_time)
);

CREATE INDEX IF NOT EXISTS idx_sprintevents_match_name ON sprint_events_cache (match_name);


