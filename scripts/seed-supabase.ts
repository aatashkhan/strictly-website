/**
 * Seed script: Migrates venues.json → Supabase cities + venues tables
 *
 * Run with: npx tsx scripts/seed-supabase.ts
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// ---------- config ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---------- load venues.json ----------
interface VenueJson {
  name: string;
  category: string;
  subcategory: string | null;
  neighborhood: string | null;
  denna_note: string | null;
  price_indicator: string | null;
  best_for: string[];
  instagram: string | null;
  google_maps: string | null;
  website: string | null;
  sources: string[];
  source_posts: string[];
  id: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  opening_hours: unknown | null;
  google_maps_url?: string | null;
  geocode_status?: string;
  status?: string;
  status_note?: string;
}

interface CityJson {
  city_name: string;
  country: string;
  region: string;
  venue_count: number;
  denna_intro: string;
  neighborhoods: string[];
  categories: Record<string, number>;
  venues: VenueJson[];
}

interface VenueDB {
  metadata: {
    version: string;
    last_updated: string;
    total_venues: number;
    total_cities: number;
    sources: string[];
  };
  cities: Record<string, CityJson>;
}

const raw = readFileSync(
  join(process.cwd(), "src", "data", "venues.json"),
  "utf-8"
);
const db: VenueDB = JSON.parse(raw);

// ---------- helpers ----------
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Haversine distance in km */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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

// Approximate city centers for nearby_getaway calculation
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  London: { lat: 51.5074, lng: -0.1278 },
  Paris: { lat: 48.8566, lng: 2.3522 },
  Rome: { lat: 41.9028, lng: 12.4964 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Seoul: { lat: 37.5665, lng: 126.978 },
  Copenhagen: { lat: 55.6761, lng: 12.5683 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  "New York City": { lat: 40.7128, lng: -74.006 },
  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  Barcelona: { lat: 41.3874, lng: 2.1686 },
  Lisbon: { lat: 38.7223, lng: -9.1393 },
  "Mexico City": { lat: 19.4326, lng: -99.1332 },
  Nashville: { lat: 36.1627, lng: -86.7816 },
  Miami: { lat: 25.7617, lng: -80.1918 },
  Austin: { lat: 30.2672, lng: -97.7431 },
  Tulum: { lat: 20.2114, lng: -87.4654 },
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  Charleston: { lat: 32.7765, lng: -79.9311 },
  Kyoto: { lat: 35.0116, lng: 135.7681 },
  Marrakech: { lat: 31.6295, lng: -7.9811 },
  Bali: { lat: -8.3405, lng: 115.092 },
  Bangkok: { lat: 13.7563, lng: 100.5018 },
  Osaka: { lat: 34.6937, lng: 135.5023 },
  Ojai: { lat: 34.448, lng: -119.2429 },
  Denver: { lat: 39.7392, lng: -104.9903 },
};

// City-specific loading tips (migrated from LoadingScreen.tsx)
const CITY_TIPS: Record<string, string[]> = {
  Paris: [
    "Skip the tourist traps near the Eiffel Tower — the real food is in the 11th",
    "Order the croissant at the counter, not the table (it's cheaper and just as good)",
    "Le Marais on a Sunday morning is strictly the move",
  ],
  Rome: [
    "Trastevere has the best dinner energy in the city",
    "Never sit down at a piazza café unless you're ready for the coperto",
    "Gelato rule: if it's piled high and neon, walk away",
  ],
  Tokyo: [
    "Convenience store onigiri at 2am hits different",
    "Shibuya for vibes, Shimokitazawa for the real finds",
    "The department store basement food halls are an actual paradise",
  ],
  London: [
    "Borough Market before 11am, before it gets chaotic",
    "Shoreditch for brunch, Soho for dinner, Hackney for drinks",
    "The pub lunch is genuinely underrated — lean into it",
  ],
  Seoul: [
    "Myeongdong is for skincare shopping, not food",
    "Late-night Korean BBQ is a non-negotiable",
    "Ikseon-dong is the neighborhood moment right now",
  ],
  "Los Angeles": [
    "Driving is inevitable but the taco truck game is worth it",
    "Arts District for coffee, Silver Lake for dinner",
    "Get to the beach by 7am — you'll have it to yourself",
  ],
  Copenhagen: [
    "Bike everywhere. Seriously, everywhere.",
    "The New Nordic thing is real and honestly worth the splurge",
    "Nørrebro has the best natural wine bars",
  ],
  "New York City": [
    "Chinatown for the strictly best dumplings, no contest",
    "West Village for a perfect dinner walk",
    "The High Line at sunset — it's a cliché because it works",
  ],
  "Mexico City": [
    "Roma Norte is the neighborhood for everything",
    "Street tacos after midnight are a spiritual experience",
    "The mercados are better than any restaurant",
  ],
  Nashville: [
    "Broadway is for tourists — East Nashville is the real scene",
    "Hot chicken is a must but pace yourself",
    "The songwriter rounds are the best live music in the country",
  ],
  Miami: [
    "Design District for shopping, Wynwood for the energy",
    "Little Havana for the cafecito, always",
    "South Beach at sunrise before the crowds",
  ],
  Barcelona: [
    "El Born over the Gothic Quarter every time",
    "Vermut hour is sacred — respect the tradition",
    "Skip La Rambla, walk Passeig de Gràcia instead",
  ],
  Lisbon: [
    "Alfama is the soul of the city",
    "The pastel de nata at Time Out Market is overrated — go to Manteigaria",
    "Take the 28 tram early or not at all",
  ],
  Amsterdam: [
    "Jordaan is the strictly best neighborhood, no debate",
    "The canal-side restaurants are a vibe but check reviews first",
    "Rent a bike on day one — you'll never look back",
  ],
  Marrakech: [
    "Get lost in the medina on purpose — that's where the magic is",
    "Rooftop dinner with a view of the Atlas Mountains",
    "The riads are the move over big hotels",
  ],
  Austin: [
    "South Congress for the walk, East Austin for the food",
    "BBQ lines are long but they're not lying about the brisket",
    "Live music on a random Tuesday — that's the Austin promise",
  ],
  Tulum: [
    "Beach clubs are pricey but pick one good one",
    "The cenotes are worth the drive every time",
    "Rent a bike, skip the taxi drama",
  ],
  "San Francisco": [
    "Mission District for the best burrito of your life",
    "Fog is part of the aesthetic — layer up",
    "The ferry building on Saturday morning is a must",
  ],
  Charleston: [
    "King Street for shopping, Husk for dinner",
    "The lowcountry cuisine is genuinely special",
    "Golden hour on the Battery is undefeated",
  ],
  Kyoto: [
    "Arashiyama bamboo grove at 7am, before the crowds",
    "The kaiseki meal is worth the splurge",
    "Temple-hop on foot — it's the best way to see the city",
  ],
};

// Recommended transit per city
const RECOMMENDED_TRANSIT: Record<string, string[]> = {
  Paris: ["public_transit", "walking_preferred"],
  Rome: ["walking_preferred", "public_transit"],
  Tokyo: ["public_transit", "walking_preferred"],
  London: ["public_transit", "walking_preferred"],
  Seoul: ["public_transit"],
  Copenhagen: ["walking_preferred"],
  "Los Angeles": ["rideshare", "rental_car"],
  "New York City": ["public_transit", "walking_preferred"],
  Amsterdam: ["walking_preferred"],
  Barcelona: ["walking_preferred", "public_transit"],
  Lisbon: ["walking_preferred", "public_transit"],
  "Mexico City": ["rideshare", "public_transit"],
  Nashville: ["rideshare", "rental_car"],
  Miami: ["rideshare", "rental_car"],
  Austin: ["rideshare", "rental_car"],
  Tulum: ["rental_car"],
  "San Francisco": ["rideshare", "public_transit"],
  Charleston: ["walking_preferred", "rideshare"],
  Kyoto: ["public_transit", "walking_preferred"],
  Marrakech: ["walking_preferred", "rideshare"],
  Bali: ["rideshare", "rental_car"],
  Bangkok: ["rideshare", "public_transit"],
  Osaka: ["public_transit", "walking_preferred"],
  Ojai: ["rental_car"],
  Denver: ["rideshare", "rental_car"],
};

// Known private/members-only venues
const PRIVATE_VENUES = ["Annabel's"];
const MEMBERS_GUESTS_VENUES = ["Soho House", "Soho Houses"];

// Known name fixes
const NAME_FIXES: Record<string, string> = {
  "le barav": "Le Barav",
};

// Norway/Switzerland sub-city mapping
// Venues in "Norway" or "Switzerland" umbrella entries need to be split
const NORWAY_SUBCITIES: Record<string, { city_name: string; country: string; region: string }> = {
  oslo: { city_name: "Oslo", country: "Norway", region: "Europe" },
  lofoten: { city_name: "Lofoten", country: "Norway", region: "Europe" },
  bergen: { city_name: "Bergen & Fjords", country: "Norway", region: "Europe" },
};

const SWITZERLAND_SUBCITIES: Record<string, { city_name: string; country: string; region: string }> = {
  mürren: { city_name: "Mürren", country: "Switzerland", region: "Europe" },
  murren: { city_name: "Mürren", country: "Switzerland", region: "Europe" },
  zermatt: { city_name: "Zermatt", country: "Switzerland", region: "Europe" },
};

function detectSubCity(
  venue: VenueJson,
  parentCity: string
): string | null {
  const lower = (venue.neighborhood ?? "").toLowerCase() + " " + (venue.address ?? "").toLowerCase() + " " + venue.name.toLowerCase();

  if (parentCity === "Norway") {
    if (lower.includes("oslo")) return "oslo";
    if (lower.includes("lofoten")) return "lofoten";
    if (lower.includes("bergen") || lower.includes("fjord")) return "bergen";
    // Default to Oslo if we can't determine
    return "oslo";
  }

  if (parentCity === "Switzerland") {
    if (lower.includes("mürren") || lower.includes("murren")) return "mürren";
    if (lower.includes("zermatt")) return "zermatt";
    // Default: keep under Switzerland generic
    return null;
  }

  return null;
}

// ---------- main seed ----------
async function seed() {
  console.log("🌱 Starting Supabase seed...\n");

  const cityIdMap = new Map<string, string>(); // city_name → UUID
  let totalVenues = 0;
  let reviewCount = 0;

  // Collect all cities to insert (including sub-cities from Norway/Switzerland)
  const citiesToInsert: Array<{
    slug: string;
    city_name: string;
    country: string;
    region: string;
    denna_intro: string | null;
    recommended_transit: string[] | null;
    loading_tips: string[] | null;
    custom_vibes: string[] | null;
  }> = [];

  const venuesByCityName = new Map<string, VenueJson[]>();

  for (const [cityKey, cityData] of Object.entries(db.cities)) {
    // Handle Norway/Switzerland splitting
    if (cityKey === "Norway" || cityKey === "Switzerland") {
      const subcityMap =
        cityKey === "Norway" ? NORWAY_SUBCITIES : SWITZERLAND_SUBCITIES;

      // Pre-create sub-city entries
      const usedSubcities = new Set<string>();
      for (const venue of cityData.venues) {
        const sub = detectSubCity(venue, cityKey);
        if (sub) usedSubcities.add(sub);
      }

      for (const subKey of Array.from(usedSubcities)) {
        const subInfo = subcityMap[subKey];
        if (!subInfo) continue;
        if (!citiesToInsert.find((c) => c.city_name === subInfo.city_name)) {
          citiesToInsert.push({
            slug: slugify(subInfo.city_name),
            city_name: subInfo.city_name,
            country: subInfo.country,
            region: subInfo.region,
            denna_intro: null,
            recommended_transit: null,
            loading_tips: null,
            custom_vibes: null,
          });
        }
        if (!venuesByCityName.has(subInfo.city_name)) {
          venuesByCityName.set(subInfo.city_name, []);
        }
      }

      // Assign venues to sub-cities
      for (const venue of cityData.venues) {
        const sub = detectSubCity(venue, cityKey);
        if (sub) {
          const subInfo = subcityMap[sub];
          if (subInfo) {
            venuesByCityName.get(subInfo.city_name)!.push(venue);
          }
        } else {
          // Can't determine sub-city, create a generic entry
          const genericName = cityKey;
          if (!citiesToInsert.find((c) => c.city_name === genericName)) {
            citiesToInsert.push({
              slug: slugify(genericName),
              city_name: genericName,
              country: cityKey,
              region: "Europe",
              denna_intro: cityData.denna_intro || null,
              recommended_transit: null,
              loading_tips: null,
              custom_vibes: null,
            });
          }
          if (!venuesByCityName.has(genericName)) {
            venuesByCityName.set(genericName, []);
          }
          venuesByCityName.get(genericName)!.push(venue);
        }
      }
      continue;
    }

    // Normal city
    citiesToInsert.push({
      slug: slugify(cityData.city_name),
      city_name: cityData.city_name,
      country: cityData.country,
      region: cityData.region,
      denna_intro: cityData.denna_intro || null,
      recommended_transit: RECOMMENDED_TRANSIT[cityData.city_name] ?? null,
      loading_tips: CITY_TIPS[cityData.city_name] ?? null,
      custom_vibes: null,
    });

    venuesByCityName.set(cityData.city_name, cityData.venues);
  }

  // Insert cities
  console.log(`📍 Inserting ${citiesToInsert.length} cities...`);
  for (const city of citiesToInsert) {
    const { data, error } = await supabase
      .from("cities")
      .upsert(city, { onConflict: "slug" })
      .select("id, city_name")
      .single();

    if (error) {
      console.error(`  ❌ Failed to insert city ${city.city_name}:`, error.message);
      continue;
    }
    cityIdMap.set(city.city_name, data.id);
    console.log(`  ✓ ${city.city_name} → ${data.id}`);
  }

  // Insert venues
  console.log(`\n🏪 Inserting venues...`);

  for (const [cityName, venues] of Array.from(venuesByCityName.entries())) {
    const cityId = cityIdMap.get(cityName);
    if (!cityId) {
      console.error(`  ❌ No city ID for "${cityName}" — skipping ${venues.length} venues`);
      continue;
    }

    const cityCenter = CITY_CENTERS[cityName];

    const venueRows = venues.map((v: VenueJson, idx: number) => {
      // Fix known name issues
      let name = v.name;
      const lowerName = name.toLowerCase();
      if (NAME_FIXES[lowerName]) {
        name = NAME_FIXES[lowerName];
      }

      // Fix Constela Café
      let dennaNoteFixed = v.denna_note;
      if (name === "Constela Café" && (!dennaNoteFixed || dennaNoteFixed.length < 10)) {
        dennaNoteFixed =
          "Cozy neighborhood café with the best cortado in Condesa. Go early, grab a window seat.";
      }

      // Determine access
      let access = "public";
      if (PRIVATE_VENUES.includes(name)) access = "private";
      if (
        MEMBERS_GUESTS_VENUES.some(
          (m) => name.toLowerCase().includes(m.toLowerCase())
        )
      )
        access = "members_guests";

      // Determine subcategory: nearby_getaway for hotels > 50km from center
      let subcategory = v.subcategory;
      if (
        v.category === "stay" &&
        v.lat &&
        v.lng &&
        cityCenter
      ) {
        const dist = haversineKm(v.lat, v.lng, cityCenter.lat, cityCenter.lng);
        if (dist > 50) {
          subcategory = "nearby_getaway";
        }
      }

      // Determine needs_review
      const needsReview =
        !dennaNoteFixed || dennaNoteFixed.length < 20;

      if (needsReview) reviewCount++;

      return {
        city_id: cityId,
        name,
        category: v.category,
        subcategory,
        neighborhood: v.neighborhood || null,
        denna_note: dennaNoteFixed || null,
        price_indicator: v.price_indicator || null,
        best_for: v.best_for ?? [],
        instagram: v.instagram || null,
        google_maps: v.google_maps || null,
        website: v.website || null,
        sources: v.sources ?? [],
        source_posts: v.source_posts ?? [],
        address: v.address || null,
        lat: v.lat,
        lng: v.lng,
        place_id: v.place_id || null,
        opening_hours: v.opening_hours || null,
        google_maps_url: v.google_maps_url || null,
        geocode_status: v.geocode_status ?? "unverified",
        status: v.status ?? "open",
        status_note: v.status_note || null,
        access,
        needs_review: needsReview,
        display_order: idx + 1,
      };
    });

    // Insert in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < venueRows.length; i += BATCH_SIZE) {
      const batch = venueRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("venues").insert(batch);
      if (error) {
        console.error(
          `  ❌ Failed batch for ${cityName} (${i}-${i + batch.length}):`,
          error.message
        );
      }
    }

    totalVenues += venueRows.length;
    console.log(`  ✓ ${cityName}: ${venueRows.length} venues`);
  }

  // London hotel neighborhoods (Stage 2 data fix, done here to avoid extra step)
  console.log("\n🏨 Fixing London hotel neighborhoods...");
  const londonId = cityIdMap.get("London");
  if (londonId) {
    const hotelNeighborhoods: Record<string, string> = {
      "Claridge's": "Mayfair",
      "The Lanesborough": "Knightsbridge",
      "The Ritz": "Mayfair",
      Bulgari: "Knightsbridge",
      "The Ned": "City of London",
      "Soho Houses": "Soho",
    };

    for (const [hotelName, neighborhood] of Object.entries(hotelNeighborhoods)) {
      const { error } = await supabase
        .from("venues")
        .update({ neighborhood })
        .eq("city_id", londonId)
        .eq("name", hotelName);
      if (error) {
        console.error(`  ❌ Failed to update ${hotelName}:`, error.message);
      } else {
        console.log(`  ✓ ${hotelName} → ${neighborhood}`);
      }
    }
  }

  console.log(`\n✅ Seed complete!`);
  console.log(`   Cities: ${cityIdMap.size}`);
  console.log(`   Venues: ${totalVenues}`);
  console.log(`   Needs review: ${reviewCount}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
