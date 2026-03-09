/**
 * Validate geocoding results and print a summary report.
 *
 * Usage:
 *   npx tsx scripts/validate-geocoding.ts
 *
 * Reads geocode-progress.json and prints:
 *   - Overall stats (total, success rate)
 *   - Per-city breakdown
 *   - List of venues needing manual review
 */

import * as fs from 'fs';
import * as path from 'path';

const PROGRESS_PATH = path.resolve(__dirname, 'geocode-progress.json');
const VENUES_PATH = path.resolve(__dirname, '..', 'src', 'data', 'venues.json');

interface GeocodeResult {
  venue_id: string;
  venue_name: string;
  city: string;
  status: 'verified' | 'unverified' | 'not_found';
  matched_name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  confidence: 'high' | 'medium' | 'low';
  needs_review: boolean;
}

interface ProgressData {
  completed: Record<string, GeocodeResult>;
  last_updated: string;
}

function main() {
  console.log('📋 Geocoding Validation Report');
  console.log('='.repeat(60));

  if (!fs.existsSync(PROGRESS_PATH)) {
    console.error('❌ No geocode-progress.json found. Run geocode-venues.ts first.');
    process.exit(1);
  }

  // Load progress and venue DB for total count
  const progress: ProgressData = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  const db = JSON.parse(fs.readFileSync(VENUES_PATH, 'utf-8'));

  const results = Object.values(progress.completed);
  const totalInDB = db.metadata.total_venues as number;

  // --- Overall Stats ---
  const verified = results.filter(r => r.status === 'verified').length;
  const unverified = results.filter(r => r.status === 'unverified').length;
  const notFound = results.filter(r => r.status === 'not_found').length;
  const geocoded = verified + unverified;

  const highConf = results.filter(r => r.confidence === 'high').length;
  const medConf = results.filter(r => r.confidence === 'medium').length;
  const lowConf = results.filter(r => r.confidence === 'low').length;

  const needsReview = results.filter(r => r.needs_review);

  console.log(`\n📊 Overall Summary`);
  console.log(`  Total venues in DB:    ${totalInDB}`);
  console.log(`  Geocoded (attempted):  ${results.length}`);
  console.log(`  Not yet attempted:     ${totalInDB - results.length}`);
  console.log('');
  console.log(`  ✅ Verified:           ${verified}  (${pct(verified, results.length)})`);
  console.log(`  🟡 Unverified:         ${unverified}  (${pct(unverified, results.length)})`);
  console.log(`  ❌ Not found:          ${notFound}  (${pct(notFound, results.length)})`);
  console.log('');
  console.log(`  📍 Success rate:       ${pct(geocoded, results.length)}`);
  console.log('');
  console.log(`  Confidence: High ${highConf} | Medium ${medConf} | Low ${lowConf}`);
  console.log(`  Needs review: ${needsReview.length} venues`);

  // --- Per-City Breakdown ---
  console.log(`\n\n📍 Per-City Breakdown`);
  console.log('-'.repeat(60));
  console.log(
    padRight('City', 20) +
    padRight('Total', 7) +
    padRight('✅', 7) +
    padRight('🟡', 7) +
    padRight('❌', 7) +
    padRight('Rate', 8)
  );
  console.log('-'.repeat(60));

  // Group by city
  const byCityMap = new Map<string, GeocodeResult[]>();
  for (const r of results) {
    if (!byCityMap.has(r.city)) byCityMap.set(r.city, []);
    byCityMap.get(r.city)!.push(r);
  }

  // Sort by city name
  const cities: [string, GeocodeResult[]][] = Array.from(byCityMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [city, cityResults] of cities) {
    const v = cityResults.filter((r: GeocodeResult) => r.status === 'verified').length;
    const u = cityResults.filter((r: GeocodeResult) => r.status === 'unverified').length;
    const n = cityResults.filter((r: GeocodeResult) => r.status === 'not_found').length;
    const rate = pct(v + u, cityResults.length);

    console.log(
      padRight(city, 20) +
      padRight(String(cityResults.length), 7) +
      padRight(String(v), 7) +
      padRight(String(u), 7) +
      padRight(String(n), 7) +
      padRight(rate, 8)
    );
  }

  // --- Venues Needing Review ---
  if (needsReview.length > 0) {
    console.log(`\n\n⚠️  Venues Needing Manual Review (${needsReview.length})`);
    console.log('-'.repeat(60));

    // Group review items by city
    const reviewByCity = new Map<string, GeocodeResult[]>();
    for (const r of needsReview) {
      if (!reviewByCity.has(r.city)) reviewByCity.set(r.city, []);
      reviewByCity.get(r.city)!.push(r);
    }

    const reviewCities: [string, GeocodeResult[]][] = Array.from(reviewByCity.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [city, items] of reviewCities) {
      console.log(`\n  📍 ${city}:`);
      for (const item of items) {
        const matchInfo = item.matched_name ? ` → "${item.matched_name}"` : '';
        const statusIcon = item.status === 'not_found' ? '❌' : '🟡';
        console.log(`    ${statusIcon} ${item.venue_name}${matchInfo} [${item.confidence}]`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Last updated: ${progress.last_updated}`);
  console.log(`\nReview CSV: scripts/geocode-review.csv`);
}

function pct(n: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

main();
