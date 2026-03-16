-- Add long_line column to venues table
-- Run this in Supabase SQL Editor
ALTER TABLE venues ADD COLUMN IF NOT EXISTS long_line BOOLEAN DEFAULT false;
