/**
 * Validate that all geocoded venues are within reasonable distance of their city.
 * Flags venues that are too far from the city center as potential misplacements.
 *
 * Usage:
 *   npx tsx scripts/validate-venue-locations.ts           # report only
 *   npx tsx scripts/validate-venue-locations.ts --fix      # delete mislocated venues
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// City centers and max allowed radius in km
const CITY_BOUNDS: Record<string, { lat: number; lng: number; maxKm: number }> = {
  Amsterdam: { lat: 52.3676, lng: 4.9041, maxKm: 30 },
  Aspen: { lat: 39.1911, lng: -106.8175, maxKm: 50 },
  Athens: { lat: 37.9838, lng: 23.7275, maxKm: 40 },
  "Bergen & Fjords": { lat: 60.3913, lng: 5.3221, maxKm: 200 },
  Biarritz: { lat: 43.4832, lng: -1.5586, maxKm: 80 },
  Copenhagen: { lat: 55.6761, lng: 12.5683, maxKm: 30 },
  Hamptons: { lat: 40.9632, lng: -72.1849, maxKm: 60 },
  Jaipur: { lat: 26.9124, lng: 75.7873, maxKm: 50 },
  Kyoto: { lat: 35.0116, lng: 135.7681, maxKm: 40 },
  Lisbon: { lat: 38.7223, lng: -9.1393, maxKm: 40 },
  Lofoten: { lat: 68.2342, lng: 14.5637, maxKm: 150 },
  London: { lat: 51.5074, lng: -0.1278, maxKm: 50 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437, maxKm: 80 },
  Mallorca: { lat: 39.5696, lng: 2.6502, maxKm: 60 },
  Marseille: { lat: 43.2965, lng: 5.3698, maxKm: 50 },
  "Mexico City": { lat: 19.4326, lng: -99.1332, maxKm: 60 },
  Milos: { lat: 36.7446, lng: 24.4272, maxKm: 30 },
  "Mürren": { lat: 46.559, lng: 7.8925, maxKm: 50 },
  Nantucket: { lat: 41.2835, lng: -70.0995, maxKm: 30 },
  "New York City": { lat: 40.7128, lng: -74.006, maxKm: 50 },
  Ojai: { lat: 34.448, lng: -119.2429, maxKm: 40 },
  Oslo: { lat: 59.9139, lng: 10.7522, maxKm: 50 },
  Paris: { lat: 48.8566, lng: 2.3522, maxKm: 50 },
  Puglia: { lat: 41.0087, lng: 16.5096, maxKm: 150 },
  Rome: { lat: 41.9028, lng: 12.4964, maxKm: 40 },
  "San Francisco": { lat: 37.7749, lng: -122.4194, maxKm: 60 },
  Sardinia: { lat: 39.2238, lng: 9.1217, maxKm: 150 },
  Seoul: { lat: 37.5665, lng: 126.978, maxKm: 40 },
  Switzerland: { lat: 46.8182, lng: 8.2275, maxKm: 200 },
  Tokyo: { lat: 35.6762, lng: 139.6503, maxKm: 100 },
  "Upstate NY": { lat: 41.7004, lng: -74.3118, maxKm: 150 },
  Zermatt: { lat: 46.0207, lng: 7.7491, maxKm: 50 },
};

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function main() {
  const doFix = process.argv.includes("--fix");

  console.log("=== Venue Location Validation ===\n");
  console.log(doFix ? "MODE: FIX (will delete mislocated venues)\n" : "MODE: Report only (pass --fix to delete)\n");

  // Get all venues with coordinates and their city names
  const { data: venues, error } = await supabase
    .from("venues")
    .select("id, name, lat, lng, category, subcategory, address, city_id, cities!inner(city_name)")
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (error) {
    console.error("Query error:", error);
    return;
  }

  console.log(`Checking ${venues?.length || 0} geocoded venues...\n`);

  const mislocated: Array<{
    id: string;
    name: string;
    cityName: string;
    address: string;
    distKm: number;
    lat: number;
    lng: number;
  }> = [];

  for (const venue of venues || []) {
    const cityName = (venue as any).cities?.city_name;
    if (!cityName) continue;

    const bounds = CITY_BOUNDS[cityName];
    if (!bounds) {
      // No bounds defined for this city — skip
      continue;
    }

    const dist = haversineKm(bounds.lat, bounds.lng, venue.lat, venue.lng);
    if (dist > bounds.maxKm) {
      mislocated.push({
        id: venue.id,
        name: venue.name,
        cityName,
        address: venue.address || "no address",
        distKm: Math.round(dist),
        lat: venue.lat,
        lng: venue.lng,
      });
    }
  }

  if (mislocated.length === 0) {
    console.log("All venues are within expected range of their cities!");
    return;
  }

  // Sort by distance (worst offenders first)
  mislocated.sort((a, b) => b.distKm - a.distKm);

  console.log(`Found ${mislocated.length} mislocated venues:\n`);
  for (const v of mislocated) {
    console.log(
      `  [${v.cityName}] ${v.name} — ${v.distKm}km away`
    );
    console.log(`    Address: ${v.address}`);
    console.log(`    Coords: ${v.lat}, ${v.lng}`);
    console.log();
  }

  if (doFix) {
    console.log(`\nDeleting ${mislocated.length} mislocated venues...`);
    const ids = mislocated.map((v) => v.id);

    // Delete in batches
    for (let i = 0; i < ids.length; i += 20) {
      const batch = ids.slice(i, i + 20);
      const { error: delErr } = await supabase
        .from("venues")
        .delete()
        .in("id", batch);
      if (delErr) {
        console.error(`Delete error:`, delErr.message);
      } else {
        console.log(`  Deleted batch ${Math.floor(i / 20) + 1} (${batch.length} venues)`);
      }
    }

    // Update venue counts for affected cities
    const affectedCities = Array.from(new Set(mislocated.map((v) => v.cityName)));
    for (const cityName of affectedCities) {
      const { data: city } = await supabase
        .from("cities")
        .select("id")
        .eq("city_name", cityName)
        .single();
      if (city) {
        const { count } = await supabase
          .from("venues")
          .select("*", { count: "exact", head: true })
          .eq("city_id", city.id);
        await supabase
          .from("cities")
          .update({ venue_count: count })
          .eq("id", city.id);
        console.log(`  Updated ${cityName} venue_count to ${count}`);
      }
    }

    console.log("\nDone! Mislocated venues removed.");
  } else {
    console.log(`\nRun with --fix to delete these ${mislocated.length} mislocated venues`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
