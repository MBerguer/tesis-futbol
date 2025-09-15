-- Add geolocation columns to venues
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Optional: simple check constraints to keep values in plausible ranges
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'venues' AND constraint_name = 'venues_latitude_range') THEN
    ALTER TABLE venues ADD CONSTRAINT venues_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'venues' AND constraint_name = 'venues_longitude_range') THEN
    ALTER TABLE venues ADD CONSTRAINT venues_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;
END $$;


