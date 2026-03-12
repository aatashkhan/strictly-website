-- Session 1D: Add essentialness columns to venues table
-- These flags tell Claude which venues are must-includes for shorter trips.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS essential_24h BOOLEAN DEFAULT FALSE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS essential_48h BOOLEAN DEFAULT FALSE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS essential_72h BOOLEAN DEFAULT FALSE;
