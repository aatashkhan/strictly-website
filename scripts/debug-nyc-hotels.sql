-- Debug: NYC hotels not displaying
-- Run these queries in Supabase SQL Editor to diagnose the issue

-- 1. Check how NYC is stored in cities table
SELECT id, city_name, slug FROM cities WHERE city_name ILIKE '%new york%' OR city_name ILIKE '%nyc%';

-- 2. Count all venues for each NYC-like city
SELECT c.city_name, c.id as city_id, COUNT(v.id) as venue_count
FROM cities c
LEFT JOIN venues v ON v.city_id = c.id
WHERE c.city_name ILIKE '%new york%' OR c.city_name ILIKE '%nyc%'
GROUP BY c.city_name, c.id;

-- 3. Check venues by category for NYC
SELECT c.city_name, v.category, COUNT(*) as count
FROM venues v
JOIN cities c ON v.city_id = c.id
WHERE c.city_name ILIKE '%new york%' OR c.city_name ILIKE '%nyc%'
GROUP BY c.city_name, v.category
ORDER BY c.city_name, v.category;

-- 4. List all "stay" venues for NYC specifically
SELECT v.name, v.category, v.subcategory, v.status, v.neighborhood, v.nearby_getaway
FROM venues v
JOIN cities c ON v.city_id = c.id
WHERE c.city_name ILIKE '%new york%' AND v.category = 'stay'
ORDER BY v.name;

-- 5. Check if any "stay" venues exist with no city_id or wrong city_id
SELECT v.name, v.city_id, c.city_name
FROM venues v
LEFT JOIN cities c ON v.city_id = c.id
WHERE v.category = 'stay' AND v.name ILIKE '%new york%' OR v.address ILIKE '%new york%' OR v.address ILIKE '%manhattan%' OR v.address ILIKE '%brooklyn%';
