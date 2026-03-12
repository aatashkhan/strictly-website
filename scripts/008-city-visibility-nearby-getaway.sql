-- Session 3A: Add city visibility toggle
-- Hidden cities won't appear in consumer-facing city selector or itinerary generation
ALTER TABLE cities ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- Session 3B: Add nearby_getaway flag to venues
-- Hotels marked as nearby getaway are excluded from the main hotel picker
-- but remain available for future getaway feature
ALTER TABLE venues ADD COLUMN IF NOT EXISTS nearby_getaway BOOLEAN DEFAULT FALSE;
