-- Cache table for aggregated per-player maxima across matches
CREATE TABLE IF NOT EXISTS player_metrics_cache (
  player_id            INTEGER NOT NULL,
  -- maxima values
  max_speed_kmh        DOUBLE PRECISION,
  max_speed_match_id   UUID,
  max_speed_table      TEXT,

  max_distance_m       DOUBLE PRECISION,
  max_distance_match_id UUID,
  max_distance_table   TEXT,

  hsr_max_m            DOUBLE PRECISION,
  hsr_max_match_id     UUID,
  hsr_max_table        TEXT,

  hmld_25_5_m          DOUBLE PRECISION,
  hmld_25_5_match_id   UUID,
  hmld_25_5_table      TEXT,
  hmld_18_m            DOUBLE PRECISION,
  hmld_18_match_id     UUID,
  hmld_18_table        TEXT,

  z6_seconds           DOUBLE PRECISION,
  z6_distance_m        DOUBLE PRECISION,
  z6_match_id          UUID,
  z6_table             TEXT,

  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (player_id)
);


