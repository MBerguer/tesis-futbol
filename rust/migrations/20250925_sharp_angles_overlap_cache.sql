-- Cache table for sharp angles overlap analysis

CREATE TABLE IF NOT EXISTS sharp_angles_overlap_cache (
  match_name              TEXT NOT NULL,
  player_display_name     TEXT NOT NULL,
  dossantos_start         DOUBLE PRECISION,
  dossantos_finish        DOUBLE PRECISION,
  dossantos_angle         DOUBLE PRECISION,
  reilly_start            DOUBLE PRECISION,
  reilly_finish           DOUBLE PRECISION,
  reilly_angle            DOUBLE PRECISION,
  overlap_start           DOUBLE PRECISION,
  overlap_end             DOUBLE PRECISION,
  diff                    DOUBLE PRECISION,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_name, player_display_name, overlap_start)
);

CREATE INDEX IF NOT EXISTS idx_sharp_angles_overlap_match_name ON sharp_angles_overlap_cache (match_name);
CREATE INDEX IF NOT EXISTS idx_sharp_angles_overlap_player ON sharp_angles_overlap_cache (player_display_name);
CREATE INDEX IF NOT EXISTS idx_sharp_angles_overlap_diff ON sharp_angles_overlap_cache (diff);

