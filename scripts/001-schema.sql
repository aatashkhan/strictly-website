-- STAGE 1: Supabase Schema Migration
-- Run this in the Supabase SQL Editor

-- Cities table
CREATE TABLE cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  city_name TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,
  denna_intro TEXT,
  recommended_transit TEXT[],
  loading_tips TEXT[],
  custom_vibes TEXT[],
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venues table
CREATE TABLE venues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  neighborhood TEXT,
  denna_note TEXT,
  price_indicator TEXT,
  best_for TEXT[],
  instagram TEXT,
  google_maps TEXT,
  website TEXT,
  sources TEXT[],
  source_posts TEXT[],
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  place_id TEXT,
  opening_hours JSONB,
  google_maps_url TEXT,
  geocode_status TEXT DEFAULT 'unverified',
  status TEXT DEFAULT 'open',
  status_note TEXT,
  access TEXT DEFAULT 'public',
  needs_review BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  display_order INTEGER,
  denna_ordering_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role TEXT DEFAULT 'editor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_venues_city_id ON venues(city_id);
CREATE INDEX idx_venues_category ON venues(category);
CREATE INDEX idx_venues_needs_review ON venues(needs_review) WHERE needs_review = TRUE;
CREATE INDEX idx_venues_city_category ON venues(city_id, category);
CREATE INDEX idx_cities_slug ON cities(slug);

-- RLS policies
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cities" ON cities FOR SELECT USING (true);
CREATE POLICY "Public read venues" ON venues FOR SELECT USING (true);

CREATE POLICY "Admin write cities" ON cities FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "Admin write venues" ON venues FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin read self" ON admin_users FOR SELECT
  USING (id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cities_updated_at BEFORE UPDATE ON cities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER venues_updated_at BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
