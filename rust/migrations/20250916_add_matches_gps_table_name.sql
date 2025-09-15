-- Add gps_table_name to matches to store the raw GPS table identifier
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS gps_table_name TEXT;

-- Optional index to speed lookups by this column (not unique)
CREATE INDEX IF NOT EXISTS idx_matches_gps_table_name ON matches (gps_table_name);

