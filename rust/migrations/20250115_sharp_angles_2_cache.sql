-- Cache table for sharp-angle turn events per match/view (variant 2)

CREATE TABLE IF NOT EXISTS sharp_angles_2_cache (
  match_name              TEXT NOT NULL,
  player_display_name     TEXT NOT NULL,
  turn_id                 BIGINT,
  start_time              DOUBLE PRECISION,
  finish_time             DOUBLE PRECISION,
  duration_seconds        DOUBLE PRECISION,
  entry_speed             DOUBLE PRECISION,
  turning_angle_degrees   DOUBLE PRECISION,
  entry_speed_category    TEXT,
  turning_angle_category  TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_name, player_display_name, turn_id, start_time, finish_time)
);

CREATE INDEX IF NOT EXISTS idx_sharp_angles_2_match_name ON sharp_angles_2_cache (match_name);
CREATE INDEX IF NOT EXISTS idx_sharp_angles_2_player ON sharp_angles_2_cache (player_display_name);
