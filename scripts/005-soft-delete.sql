-- Add soft-delete support to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient filtering of non-deleted venues
CREATE INDEX IF NOT EXISTS idx_venues_deleted_at ON venues (deleted_at) WHERE deleted_at IS NULL;
