import { createServerSupabase } from "./supabase";
import { FEATURED_CITIES } from "./constants";
import type { CityData, Venue } from "./types";

// ──────────────────────────────────────────────────────
// Server-side Supabase data access layer
// Replaces the old JSON-file approach.
// ──────────────────────────────────────────────────────

/** Return sorted list of all city names */
export async function getCities(): Promise<string[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("cities")
    .select("city_name, hidden")
    .order("city_name");
  if (error) {
    console.error("getCities error:", error.message);
    return [];
  }
  return data.filter((c) => !c.hidden).map((c) => c.city_name);
}

/** Light city metadata — no venues, for form dropdowns */
export interface CityMeta {
  city_name: string;
  country: string;
  venue_count: number;
  neighborhoods: string[];
}

export async function getCityMetas(): Promise<CityMeta[]> {
  const supabase = createServerSupabase();

  // Fetch cities
  const { data: cities, error: citiesErr } = await supabase
    .from("cities")
    .select("id, city_name, country, hidden")
    .order("city_name");
  if (citiesErr || !cities) return [];

  // Filter out hidden cities from consumer-facing list
  const visibleCities = cities.filter((c) => !c.hidden);

  // Fetch ALL venue data — paginate because Supabase caps at 1000 rows per request
  const allVenues: { city_id: string; neighborhood: string | null }[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  while (true) {
    const { data, error: venueErr } = await supabase
      .from("venues")
      .select("city_id, neighborhood")
      .range(offset, offset + PAGE_SIZE - 1);
    if (venueErr) {
      console.error("getCityMetas venue query error:", venueErr.message);
      break;
    }
    if (!data || data.length === 0) break;
    allVenues.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const cityStats = new Map<string, { count: number; neighborhoods: Set<string> }>();
  for (const v of allVenues) {
    if (!cityStats.has(v.city_id)) {
      cityStats.set(v.city_id, { count: 0, neighborhoods: new Set() });
    }
    const s = cityStats.get(v.city_id)!;
    s.count++;
    if (v.neighborhood) s.neighborhoods.add(v.neighborhood);
  }

  return visibleCities.map((c) => {
    const stats = cityStats.get(c.id);
    return {
      city_name: c.city_name,
      country: c.country,
      venue_count: stats?.count ?? 0,
      neighborhoods: Array.from(stats?.neighborhoods ?? []).sort(),
    };
  });
}

/** Helper to transform a Supabase venue row to the Venue type */
function transformVenue(row: Record<string, unknown>): Venue {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    subcategory: (row.subcategory as string) ?? null,
    neighborhood: (row.neighborhood as string) ?? null,
    denna_note: (row.denna_note as string) ?? null,
    price_indicator: (row.price_indicator as string) ?? null,
    best_for: (row.best_for as string[]) ?? [],
    instagram: (row.instagram as string) ?? null,
    google_maps: (row.google_maps as string) ?? null,
    website: (row.website as string) ?? null,
    sources: (row.sources as string[]) ?? [],
    source_posts: (row.source_posts as string[]) ?? [],
    address: (row.address as string) ?? null,
    lat: (row.lat as number) ?? null,
    lng: (row.lng as number) ?? null,
    place_id: (row.place_id as string) ?? null,
    opening_hours: (row.opening_hours as Venue["opening_hours"]) ?? null,
    google_maps_url: (row.google_maps_url as string) ?? null,
    geocode_status: (row.geocode_status as Venue["geocode_status"]) ?? "unverified",
    image_url: (row.image_url as string) ?? null,
    access: (row.access as Venue["access"]) ?? "public",
    status: (row.status as Venue["status"]) ?? "open",
    status_note: (row.status_note as string) ?? undefined,
    essential_24h: (row.essential_24h as boolean) ?? false,
    essential_48h: (row.essential_48h as boolean) ?? false,
    essential_72h: (row.essential_72h as boolean) ?? false,
    booking_difficulty: (row.booking_difficulty as Venue["booking_difficulty"]) ?? "walk_in",
    expect_wait: (row.expect_wait as boolean) ?? false,
    conditional_on_hotel: (row.conditional_on_hotel as string) ?? null,
    ai_generated_note: (row.ai_generated_note as string) ?? null,
    image_urls: (row.image_urls as string[]) ?? [],
    nearby_getaway: (row.nearby_getaway as boolean) ?? false,
  };
}

/** Count venues per category */
function countByCategory(venues: Venue[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of venues) {
    counts[v.category] = (counts[v.category] ?? 0) + 1;
  }
  return counts;
}

/** Full city data including venues — used by /api/generate, /api/chat */
export async function getCityData(cityName: string): Promise<CityData | null> {
  const supabase = createServerSupabase();

  const { data: city, error: cityErr } = await supabase
    .from("cities")
    .select("*")
    .eq("city_name", cityName)
    .single();

  if (cityErr || !city) return null;

  const { data: venues, error: venueErr } = await supabase
    .from("venues")
    .select("*")
    .eq("city_id", city.id)
    .order("display_order", { ascending: true, nullsFirst: false });

  if (venueErr) console.error("getCityData venue query error:", venueErr.message);

  const transformedVenues = (venues ?? []).map(transformVenue);

  return {
    city_name: city.city_name,
    country: city.country,
    region: city.region,
    venue_count: transformedVenues.length,
    denna_intro: city.denna_intro ?? "",
    neighborhoods: Array.from(
      new Set(
        transformedVenues
          .map((v) => v.neighborhood)
          .filter(Boolean) as string[]
      )
    ),
    categories: countByCategory(transformedVenues),
    venues: transformedVenues,
    // Extended fields
    recommended_transit: city.recommended_transit ?? [],
    loading_tips: city.loading_tips ?? [],
    custom_vibes: city.custom_vibes ?? [],
    is_spread_region: city.is_spread_region ?? false,
  };
}

/** Featured cities with basic data for homepage grid */
export async function getFeaturedCities(): Promise<
  { name: string; data: CityData }[]
> {
  const results: { name: string; data: CityData }[] = [];
  for (const name of FEATURED_CITIES) {
    const data = await getCityData(name);
    if (data) results.push({ name, data });
  }
  return results;
}
