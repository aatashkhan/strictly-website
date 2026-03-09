/**
 * Geocode all venues in venues.json using Google Places API (Text Search).
 *
 * Usage:
 *   npx tsx scripts/geocode-venues.ts
 *
 * Requires GOOGLE_MAPS_API_KEY in .env.local
 *
 * Features:
 *   - Resumable: saves progress to scripts/geocode-progress.json
 *   - Rate-limited: respects Google API limits
 *   - Outputs scripts/geocode-review.csv for manual spot-checking
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.error('❌ GOOGLE_MAPS_API_KEY not found in .env.local');
  process.exit(1);
}

// --- Paths ---
const VENUES_PATH = path.resolve(__dirname, '..', 'src', 'data', 'venues.json');
const PROGRESS_PATH = path.resolve(__dirname, 'geocode-progress.json');
const REVIEW_CSV_PATH = path.resolve(__dirname, 'geocode-review.csv');

// --- Types ---
interface VenueEntry {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  [key: string]: unknown;
}

interface CityEntry {
  city_name: string;
  country: string;
  venues: VenueEntry[];
}

interface VenueDB {
  metadata: Record<string, unknown>;
  cities: Record<string, CityEntry>;
}

interface GeocodeResult {
  venue_id: string;
  venue_name: string;
  city: string;
  status: 'verified' | 'unverified' | 'not_found';
  matched_name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  opening_hours: {
    periods: Array<{ open: { day: number; time: string }; close: { day: number; time: string } }>;
    weekday_text: string[];
  } | null;
  google_maps_url: string | null;
  confidence: 'high' | 'medium' | 'low';
  needs_review: boolean;
}

interface ProgressData {
  completed: Record<string, GeocodeResult>;
  last_updated: string;
}

// --- City center coordinates for disambiguation ---
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Aspen': { lat: 39.1911, lng: -106.8175 },
  'Athens': { lat: 37.9838, lng: 23.7275 },
  'Biarritz': { lat: 43.4832, lng: -1.5586 },
  'Copenhagen': { lat: 55.6761, lng: 12.5683 },
  'Hamptons': { lat: 40.9632, lng: -72.1847 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 },
  'Kyoto': { lat: 35.0116, lng: 135.7681 },
  'Lisbon': { lat: 38.7223, lng: -9.1393 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'Mallorca': { lat: 39.6953, lng: 3.0176 },
  'Marseille': { lat: 43.2965, lng: 5.3698 },
  'Mexico City': { lat: 19.4326, lng: -99.1332 },
  'Milos': { lat: 36.7446, lng: 24.4271 },
  'Nantucket': { lat: 41.2835, lng: -70.0995 },
  'New York City': { lat: 40.7128, lng: -74.0060 },
  'Norway': { lat: 59.9139, lng: 10.7522 },
  'Ojai': { lat: 34.4480, lng: -119.2429 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Puglia': { lat: 41.0128, lng: 16.4966 },
  'Rome': { lat: 41.9028, lng: 12.4964 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Sardinia': { lat: 40.1209, lng: 9.0129 },
  'Seoul': { lat: 37.5665, lng: 126.9780 },
  'Switzerland': { lat: 46.8182, lng: 8.2275 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Upstate NY': { lat: 42.6526, lng: -73.7562 },
};

// --- Category to Google Places type mapping for disambiguation ---
const CATEGORY_TYPE_HINTS: Record<string, string[]> = {
  'eat': ['restaurant', 'cafe', 'bakery', 'food'],
  'drink': ['bar', 'cafe', 'night_club'],
  'stay': ['lodging', 'hotel'],
  'shop': ['store', 'shopping_mall', 'clothing_store'],
  'explore': ['tourist_attraction', 'museum', 'park', 'point_of_interest'],
  'spa': ['spa', 'beauty_salon', 'health'],
};

// --- Rate limiting ---
const DELAY_MS = 200; // 200ms between requests (~5/sec, well under Google's limit)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Haversine distance in km ---
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Load / save progress ---
function loadProgress(): ProgressData {
  if (fs.existsSync(PROGRESS_PATH)) {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  }
  return { completed: {}, last_updated: new Date().toISOString() };
}

function saveProgress(progress: ProgressData): void {
  progress.last_updated = new Date().toISOString();
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

// --- Google Places API calls ---
async function textSearch(query: string, locationBias?: { lat: number; lng: number }): Promise<any[]> {
  const params = new URLSearchParams({
    query,
    key: API_KEY!,
  });
  if (locationBias) {
    params.set('location', `${locationBias.lat},${locationBias.lng}`);
    params.set('radius', '50000'); // 50km radius bias
  }

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status === 'OK') return data.results;
  if (data.status === 'ZERO_RESULTS') return [];

  console.warn(`  ⚠️  Text Search returned status: ${data.status} — ${data.error_message || ''}`);
  return [];
}

async function getPlaceDetails(placeId: string): Promise<any | null> {
  const fields = 'formatted_address,geometry,place_id,name,opening_hours,url,types';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status === 'OK') return data.result;
  console.warn(`  ⚠️  Place Details returned status: ${data.status}`);
  return null;
}

// --- Pick best result from search ---
function pickBestResult(
  results: any[],
  cityName: string,
  category: string
): { result: any; confidence: 'high' | 'medium' | 'low'; needsReview: boolean } {
  if (results.length === 0) {
    return { result: null, confidence: 'low', needsReview: true };
  }

  const cityCenter = CITY_CENTERS[cityName];
  const typeHints = CATEGORY_TYPE_HINTS[category] || [];

  // Score each result
  const scored = results.slice(0, 5).map(r => {
    let score = 0;

    // Distance from city center (closer = better)
    if (cityCenter && r.geometry?.location) {
      const dist = haversineKm(
        cityCenter.lat, cityCenter.lng,
        r.geometry.location.lat, r.geometry.location.lng
      );
      if (dist < 10) score += 3;
      else if (dist < 30) score += 2;
      else if (dist < 80) score += 1;
      // > 80km from city center: probably wrong place
    }

    // Type match
    const resultTypes: string[] = r.types || [];
    const hasTypeMatch = typeHints.some(t => resultTypes.includes(t));
    if (hasTypeMatch) score += 2;

    // Higher rating is a mild signal
    if (r.rating && r.rating >= 4.0) score += 1;

    // Business status
    if (r.business_status === 'OPERATIONAL') score += 1;

    return { result: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  // Confidence assessment
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  let needsReview = false;

  if (best.score >= 5 && results.length === 1) {
    confidence = 'high';
  } else if (best.score >= 4) {
    confidence = 'high';
  } else if (best.score >= 2) {
    confidence = 'medium';
    needsReview = true;
  } else {
    confidence = 'low';
    needsReview = true;
  }

  // Check distance — if best result is >80km from city center, flag it
  if (cityCenter && best.result.geometry?.location) {
    const dist = haversineKm(
      cityCenter.lat, cityCenter.lng,
      best.result.geometry.location.lat, best.result.geometry.location.lng
    );
    if (dist > 80) {
      confidence = 'low';
      needsReview = true;
    }
  }

  return { result: best.result, confidence, needsReview };
}

// --- Geocode a single venue ---
async function geocodeVenue(venue: VenueEntry, cityName: string): Promise<GeocodeResult> {
  const query = `${venue.name}, ${cityName}`;
  const cityCenter = CITY_CENTERS[cityName];

  // Step 1: Text Search
  const results = await textSearch(query, cityCenter);
  await sleep(DELAY_MS);

  const { result: best, confidence, needsReview } = pickBestResult(results, cityName, venue.category);

  if (!best) {
    return {
      venue_id: venue.id,
      venue_name: venue.name,
      city: cityName,
      status: 'not_found',
      matched_name: null,
      address: null,
      lat: null,
      lng: null,
      place_id: null,
      opening_hours: null,
      google_maps_url: null,
      confidence: 'low',
      needs_review: true,
    };
  }

  // Step 2: Get Place Details for opening hours
  const details = await getPlaceDetails(best.place_id);
  await sleep(DELAY_MS);

  let openingHours = null;
  if (details?.opening_hours) {
    openingHours = {
      periods: (details.opening_hours.periods || []).map((p: any) => ({
        open: { day: p.open?.day ?? 0, time: p.open?.time ?? '0000' },
        close: { day: p.close?.day ?? 0, time: p.close?.time ?? '0000' },
      })),
      weekday_text: details.opening_hours.weekday_text || [],
    };
  }

  const status = confidence === 'high' ? 'verified' : 'unverified';

  return {
    venue_id: venue.id,
    venue_name: venue.name,
    city: cityName,
    status,
    matched_name: details?.name || best.name || null,
    address: details?.formatted_address || best.formatted_address || null,
    lat: best.geometry?.location?.lat ?? null,
    lng: best.geometry?.location?.lng ?? null,
    place_id: best.place_id || null,
    opening_hours: openingHours,
    google_maps_url: details?.url || null,
    confidence,
    needs_review: needsReview,
  };
}

// --- Write review CSV ---
function writeReviewCSV(results: GeocodeResult[]): void {
  const header = 'venue_id,name,city,matched_name,address,lat,lng,confidence,needs_review';
  const escapeCSV = (s: string | null) => {
    if (s == null) return '';
    const str = String(s);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = results.map(r =>
    [r.venue_id, r.venue_name, r.city, r.matched_name, r.address, r.lat, r.lng, r.confidence, r.needs_review]
      .map(v => escapeCSV(v as string | null))
      .join(',')
  );

  fs.writeFileSync(REVIEW_CSV_PATH, [header, ...rows].join('\n'));
}

// --- Main ---
async function main() {
  console.log('🌍 Strictly Venue Geocoder');
  console.log('='.repeat(50));

  // Load venue database
  const db: VenueDB = JSON.parse(fs.readFileSync(VENUES_PATH, 'utf-8'));
  const progress = loadProgress();

  // Optional --city filter (e.g. --city "Milos")
  const cityFlagIdx = process.argv.indexOf('--city');
  const cityFilter = cityFlagIdx !== -1 ? process.argv[cityFlagIdx + 1] : null;
  if (cityFilter) {
    if (!db.cities[cityFilter]) {
      console.error(`❌ City "${cityFilter}" not found in venues.json`);
      console.error(`   Available: ${Object.keys(db.cities).join(', ')}`);
      process.exit(1);
    }
    console.log(`🔍 Filtering to city: ${cityFilter}`);
  }

  // Flatten all venues with city info
  const allVenues: { venue: VenueEntry; city: string }[] = [];
  for (const [cityName, cityData] of Object.entries(db.cities)) {
    if (cityFilter && cityName !== cityFilter) continue;
    for (const venue of cityData.venues) {
      allVenues.push({ venue, city: cityName });
    }
  }

  const total = allVenues.length;
  const alreadyDone = Object.keys(progress.completed).length;
  const remaining = allVenues.filter(v => !progress.completed[v.venue.id]);

  console.log(`\n📊 Total venues: ${total}`);
  console.log(`✅ Already completed: ${alreadyDone}`);
  console.log(`⏳ Remaining: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log('\n🎉 All venues already geocoded! Run merge script to apply results.');
    writeReviewCSV(Object.values(progress.completed));
    console.log(`📄 Review CSV written to: ${REVIEW_CSV_PATH}`);
    return;
  }

  console.log(`\n🚀 Starting geocoding...\n`);

  let processed = 0;
  let successes = 0;
  let failures = 0;
  let currentCity = '';

  for (const { venue, city } of remaining) {
    // City header
    if (city !== currentCity) {
      currentCity = city;
      const cityRemaining = remaining.filter(v => v.city === city && !progress.completed[v.venue.id]).length;
      console.log(`\n📍 ${city} (${cityRemaining} venues)`);
      console.log('-'.repeat(40));
    }

    processed++;
    const globalIdx = alreadyDone + processed;

    try {
      const result = await geocodeVenue(venue, city);
      progress.completed[venue.id] = result;

      const statusIcon = result.status === 'verified' ? '✅' :
                         result.status === 'unverified' ? '🟡' : '❌';
      const reviewFlag = result.needs_review ? ' [REVIEW]' : '';

      console.log(
        `  ${statusIcon} [${globalIdx}/${total}] ${venue.name}` +
        (result.matched_name ? ` → ${result.matched_name}` : '') +
        ` (${result.confidence})${reviewFlag}`
      );

      if (result.status !== 'not_found') successes++;
      else failures++;

    } catch (err: any) {
      console.error(`  ❌ [${globalIdx}/${total}] ${venue.name} — ERROR: ${err.message}`);
      failures++;

      // Save a not_found entry so we can retry later if needed
      progress.completed[venue.id] = {
        venue_id: venue.id,
        venue_name: venue.name,
        city,
        status: 'not_found',
        matched_name: null,
        address: null,
        lat: null,
        lng: null,
        place_id: null,
        opening_hours: null,
        google_maps_url: null,
        confidence: 'low',
        needs_review: true,
      };
    }

    // Save progress every 10 venues
    if (processed % 10 === 0) {
      saveProgress(progress);
    }
  }

  // Final save
  saveProgress(progress);

  // Write review CSV
  writeReviewCSV(Object.values(progress.completed));

  console.log('\n' + '='.repeat(50));
  console.log('📊 Geocoding Complete');
  console.log(`  ✅ Found: ${successes}`);
  console.log(`  ❌ Not found: ${failures}`);
  console.log(`  📊 Success rate: ${((successes / (successes + failures)) * 100).toFixed(1)}%`);
  console.log(`\n📁 Progress saved to: ${PROGRESS_PATH}`);
  console.log(`📄 Review CSV saved to: ${REVIEW_CSV_PATH}`);
  console.log(`\n🔜 Next step: review the CSV, then run: npx tsx scripts/merge-geocoding.ts`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
