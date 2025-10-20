-- Cache table for grouped acceleration events (Reilly 2021)

CREATE TABLE IF NOT EXISTS sharp_angles_3_cache (
  match_name              TEXT NOT NULL,
  player_id               INTEGER NOT NULL,
  player_display_name     TEXT NOT NULL,
  inicio_s                DOUBLE PRECISION NOT NULL,
  fin_s                   DOUBLE PRECISION,
  avg_speed               DOUBLE PRECISION,
  distance                DOUBLE PRECISION,
  angle_diff              DOUBLE PRECISION,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_name, player_id, inicio_s)
);

CREATE INDEX IF NOT EXISTS idx_sharp_angles_3_match_name ON sharp_angles_3_cache (match_name);
CREATE INDEX IF NOT EXISTS idx_sharp_angles_3_player ON sharp_angles_3_cache (player_display_name);
CREATE INDEX IF NOT EXISTS idx_sharp_angles_3_time ON sharp_angles_3_cache (inicio_s);

