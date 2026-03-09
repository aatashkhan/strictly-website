/**
 * Merge geocoding results from geocode-progress.json back into venues.json.
 *
 * Usage:
 *   npx tsx scripts/merge-geocoding.ts
 *
 * This adds the new geo fields to each venue in venues.json:
 *   address, lat, lng, place_id, opening_hours, google_maps_url, geocode_status
 */

import * as fs from 'fs';
import * as path from 'path';

const VENUES_PATH = path.resolve(__dirname, '..', 'src', 'data', 'venues.json');
const PROGRESS_PATH = path.resolve(__dirname, 'geocode-progress.json');

interface GeocodeResult {
  venue_id: string;
  status: 'verified' | 'unverified' | 'not_found';
  address: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  opening_hours: {
    periods: Array<{ open: { day: number; time: string }; close: { day: number; time: string } }>;
    weekday_text: string[];
  } | null;
  google_maps_url: string | null;
}

interface ProgressData {
  completed: Record<string, GeocodeResult>;
  last_updated: string;
}

function main() {
  console.log('🔀 Merging geocoding data into venues.json');
  console.log('='.repeat(50));

  // Check progress file exists
  if (!fs.existsSync(PROGRESS_PATH)) {
    console.error('❌ No geocode-progress.json found. Run geocode-venues.ts first.');
    process.exit(1);
  }

  const progress: ProgressData = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  const db = JSON.parse(fs.readFileSync(VENUES_PATH, 'utf-8'));

  const completedCount = Object.keys(progress.completed).length;
  console.log(`\n📊 Geocode results available: ${completedCount}`);

  let merged = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [cityName, cityData] of Object.entries(db.cities) as [string, any][]) {
    for (const venue of cityData.venues) {
      const result = progress.completed[venue.id];

      if (!result) {
        // No geocode data for this venue — set defaults
        venue.address = venue.address ?? null;
        venue.lat = venue.lat ?? null;
        venue.lng = venue.lng ?? null;
        venue.place_id = venue.place_id ?? null;
        venue.opening_hours = venue.opening_hours ?? null;
        venue.google_maps_url = venue.google_maps_url ?? null;
        venue.geocode_status = venue.geocode_status ?? 'not_found';
        skipped++;
        continue;
      }

      venue.address = result.address;
      venue.lat = result.lat;
      venue.lng = result.lng;
      venue.place_id = result.place_id;
      venue.opening_hours = result.opening_hours;
      venue.google_maps_url = result.google_maps_url;
      venue.geocode_status = result.status;

      if (result.status === 'not_found') notFound++;
      else merged++;
    }
  }

  // Update metadata
  db.metadata.last_updated = new Date().toISOString().split('T')[0];

  // Write back
  fs.writeFileSync(VENUES_PATH, JSON.stringify(db, null, 2));

  console.log(`\n✅ Merged: ${merged} venues`);
  console.log(`❌ Not found: ${notFound} venues`);
  console.log(`⏭️  Skipped (no geocode data): ${skipped} venues`);
  console.log(`\n📁 Updated: ${VENUES_PATH}`);
  console.log('\n🔜 Next step: run validate-geocoding.ts to see the summary report');
}

main();
