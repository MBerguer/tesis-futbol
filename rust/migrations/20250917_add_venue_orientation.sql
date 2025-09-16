-- Add orientation column to venues with default and range constraint
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS orientation INTEGER NOT NULL DEFAULT 0;

-- Ensure value stays within [-180, 180]
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'venues_orientation_range'
      AND table_name = 'venues'
  ) THEN
    ALTER TABLE venues
      ADD CONSTRAINT venues_orientation_range CHECK (orientation BETWEEN -180 AND 180);
  END IF;
END $$;

