-- Session 4B: Add is_spread_region flag to cities
-- For spread-out regions (Hamptons, Upstate NY, Jaipur), when this flag is true,
-- the itinerary builder shows a distance preference question:
-- "How far are you willing to drive?" (30 min / 1 hr / anything)
ALTER TABLE cities ADD COLUMN IF NOT EXISTS is_spread_region BOOLEAN DEFAULT FALSE;
