-- Add indexes to all_matches_filtred materialized view for faster research queries
-- These indexes significantly improve query performance for the research endpoints

CREATE INDEX IF NOT EXISTS idx_amf_match_name 
ON all_matches_filtred(match_name);

CREATE INDEX IF NOT EXISTS idx_amf_player_display_name 
ON all_matches_filtred(player_display_name);

CREATE INDEX IF NOT EXISTS idx_amf_seconds_since_midnight 
ON all_matches_filtred(seconds_since_midnight);

CREATE INDEX IF NOT EXISTS idx_amf_match_player 
ON all_matches_filtred(match_name, player_display_name);

CREATE INDEX IF NOT EXISTS idx_amf_speed 
ON all_matches_filtred(speed);

CREATE INDEX IF NOT EXISTS idx_amf_player_acceleration 
ON all_matches_filtred(player_acceleration_final_smooth);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_amf_match_player_time 
ON all_matches_filtred(match_name, player_display_name, seconds_since_midnight);

