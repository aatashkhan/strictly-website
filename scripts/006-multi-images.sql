-- Session 1F: Add image_urls array column and migrate existing single images
-- Keeps image_url for backward compatibility, image_urls is the source of truth.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Migrate existing single image_url values into the image_urls array
UPDATE venues
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND (image_urls IS NULL OR image_urls = '{}');
