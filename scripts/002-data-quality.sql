-- STAGE 2: Data Quality Fixes — Run after seed-supabase.ts
-- These are verification queries and additional fixes

-- ===== 2A: Fix venue names =====

-- Fix le barav (should already be done by seed, but verify)
UPDATE venues SET name = 'Le Barav' WHERE name = 'le barav';

-- Audit for other malformed names (all lowercase, longer than 3 chars)
-- Run this SELECT to inspect, then fix manually:
-- SELECT id, name, city_id FROM venues WHERE name = LOWER(name) AND LENGTH(name) > 3;

-- ===== 2A: Fix Constela Café (should already be done by seed) =====
UPDATE venues SET
  denna_note = 'Cozy neighborhood café with the best cortado in Condesa. Go early, grab a window seat.',
  needs_review = true
WHERE name = 'Constela Café' AND (denna_note IS NULL OR LENGTH(denna_note) < 10);

-- ===== 2A: Flag short/missing notes =====
UPDATE venues SET needs_review = true
WHERE denna_note IS NULL OR LENGTH(denna_note) < 20;

-- ===== 2B: London hotel neighborhoods (should already be done by seed) =====
-- Verify:
-- SELECT v.name, v.neighborhood FROM venues v
-- JOIN cities c ON v.city_id = c.id
-- WHERE c.city_name = 'London' AND v.category = 'stay';

-- ===== 2C: Mark private venues (should already be done by seed) =====
UPDATE venues SET access = 'private' WHERE name = 'Annabel''s' AND access != 'private';
UPDATE venues SET access = 'members_guests' WHERE (name ILIKE '%soho house%' OR name = 'Soho Houses') AND access != 'members_guests';

-- ===== 2D: Verify Norway/Switzerland split =====
-- Run this to confirm separate city entries:
-- SELECT city_name, COUNT(*) as venue_count FROM cities c
-- JOIN venues v ON v.city_id = c.id
-- WHERE c.country IN ('Norway', 'Switzerland')
-- GROUP BY city_name;

-- ===== 2E: Verify nearby_getaway tagging =====
-- Run this to confirm hotels > 50km from center are tagged:
-- SELECT v.name, c.city_name, v.subcategory
-- FROM venues v
-- JOIN cities c ON v.city_id = c.id
-- WHERE v.category = 'stay' AND v.subcategory = 'nearby_getaway';

-- ===== Summary queries for verification =====

-- Total venues and cities
-- SELECT COUNT(*) as total_venues FROM venues;
-- SELECT COUNT(*) as total_cities FROM cities;

-- Venues needing review
-- SELECT COUNT(*) as needs_review FROM venues WHERE needs_review = true;

-- Venues by status
-- SELECT status, COUNT(*) FROM venues GROUP BY status;

-- Venues by access level
-- SELECT access, COUNT(*) FROM venues GROUP BY access;

-- Cities with venue counts
-- SELECT c.city_name, COUNT(v.id) as venue_count
-- FROM cities c LEFT JOIN venues v ON v.city_id = c.id
-- GROUP BY c.city_name ORDER BY venue_count DESC;
