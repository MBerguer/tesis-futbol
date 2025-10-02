-- Cache table for sharp-angle turn events per match/view

CREATE TABLE IF NOT EXISTS sharp_angles_cache (
  match_name              TEXT NOT NULL,
  player_display_name     TEXT NOT NULL,
  seconds_since_midnight  DOUBLE PRECISION,
  start_time              DOUBLE PRECISION,
  finish_time             DOUBLE PRECISION,
  duration_seconds        DOUBLE PRECISION,
  angle_degrees           DOUBLE PRECISION,
  actual_dist_in          DOUBLE PRECISION,
  actual_dist_out         DOUBLE PRECISION,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_name, player_display_name, seconds_since_midnight, start_time, finish_time)
);

CREATE INDEX IF NOT EXISTS idx_sharp_angles_match_name ON sharp_angles_cache (match_name);
CREATE INDEX IF NOT EXISTS idx_sharp_angles_player ON sharp_angles_cache (player_display_name);

