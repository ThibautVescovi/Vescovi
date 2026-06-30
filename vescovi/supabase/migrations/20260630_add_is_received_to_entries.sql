-- Add is_received column to entries table
-- This tracks whether the wine bottle has been received by the winner

ALTER TABLE entries
ADD COLUMN is_received BOOLEAN DEFAULT false;

-- Add comment to the column
COMMENT ON COLUMN entries.is_received IS 'Indicates whether the wine bottle has been received by the winner';

