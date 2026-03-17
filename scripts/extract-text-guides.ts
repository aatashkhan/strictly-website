/**
 * Extract venues from Denna's text-based Substack guides (recommendations_db.json + city_guides.json),
 * cross-reference with Supabase, insert missing venues, and geocode them.
 *
 * Usage:
 *   npx tsx scripts/extract-text-guides.ts                # dry run
 *   npx tsx scripts/extract-text-guides.ts --insert       # live insert + geocode
 *   npx tsx scripts/extract-text-guides.ts --city "Paris" # single city
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ExtractedVenue {
  name: string;
  category: string;
  subcategory: string;
  neighborhood: string;
  denna_note: string;
  city?: string; // for multi-city guides
}

// ── Source city → Supabase city mapping ───────────────────────────

const CITY_MAP: Record<string, string[]> = {
  Norway: ["Oslo", "Bergen & Fjords", "Lofoten"],
  Switzerland: ["Zermatt", "Mürren"],
  "New York City": ["New York City"],
  Paris: ["Paris"],
  London: ["London"],
  Tokyo: ["Tokyo"],
  Seoul: ["Seoul"],
  Rome: ["Rome"],
  "Los Angeles": ["Los Angeles"],
  "San Francisco": ["San Francisco"],
  "Mexico City": ["Mexico City"],
  Amsterdam: ["Amsterdam"],
  Athens: ["Athens"],
  Biarritz: ["Biarritz"],
  Copenhagen: ["Copenhagen"],
  Hamptons: ["Hamptons"],
  Jaipur: ["Jaipur"],
  Kyoto: ["Kyoto"],
  Lisbon: ["Lisbon"],
  Mallorca: ["Mallorca"],
  Marseille: ["Marseille"],
  Milos: ["Milos"],
  Nantucket: ["Nantucket"],
  Ojai: ["Ojai"],
  Puglia: ["Puglia"],
  Sardinia: ["Sardinia"],
  Aspen: ["Aspen"],
  "Upstate NY": ["Upstate NY"],
};

// City centers for geocoding
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  Aspen: { lat: 39.1911, lng: -106.8175 },
  Athens: { lat: 37.9838, lng: 23.7275 },
  "Bergen & Fjords": { lat: 60.3913, lng: 5.3221 },
  Biarritz: { lat: 43.4832, lng: -1.5586 },
  Copenhagen: { lat: 55.6761, lng: 12.5683 },
  Hamptons: { lat: 40.9632, lng: -72.1849 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Kyoto: { lat: 35.0116, lng: 135.7681 },
  Lisbon: { lat: 38.7223, lng: -9.1393 },
  Lofoten: { lat: 68.2342, lng: 14.5637 },
  London: { lat: 51.5074, lng: -0.1278 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  Mallorca: { lat: 39.5696, lng: 2.6502 },
  Marseille: { lat: 43.2965, lng: 5.3698 },
  "Mexico City": { lat: 19.4326, lng: -99.1332 },
  Milos: { lat: 36.7446, lng: 24.4272 },
  Mürren: { lat: 46.559, lng: 7.8925 },
  Nantucket: { lat: 41.2835, lng: -70.0995 },
  "New York City": { lat: 40.7128, lng: -74.006 },
  Ojai: { lat: 34.448, lng: -119.2429 },
  Oslo: { lat: 59.9139, lng: 10.7522 },
  Paris: { lat: 48.8566, lng: 2.3522 },
  Puglia: { lat: 41.0087, lng: 16.5096 },
  Rome: { lat: 41.9028, lng: 12.4964 },
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  Sardinia: { lat: 39.2238, lng: 9.1217 },
  Seoul: { lat: 37.5665, lng: 126.978 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  "Upstate NY": { lat: 41.7004, lng: -74.3118 },
  Zermatt: { lat: 46.0207, lng: 7.7491 },
};

// ── Gather text from all sources ─────────────────────────────────

function gatherCityTexts(): Map<string, string[]> {
  const dataDir = path.resolve(__dirname, "../../strictly_data");
  const cityTexts = new Map<string, string[]>();

  // Source 1: recommendations_db.json
  const recDbPath = path.join(dataDir, "recommendations_db.json");
  if (fs.existsSync(recDbPath)) {
    const recDb = JSON.parse(fs.readFileSync(recDbPath, "utf8"));
    for (const [city, data] of Object.entries(recDb) as [string, any][]) {
      if (!cityTexts.has(city)) cityTexts.set(city, []);
      for (const post of data.posts || []) {
        if (post.full_text && post.full_text.length > 50) {
          cityTexts.get(city)!.push(
            `=== SOURCE: "${post.title}" (Substack post) ===\n${post.full_text}`
          );
        }
      }
    }
  }

  // Source 2: city_guides.json
  const cgPath = path.join(dataDir, "city_guides.json");
  if (fs.existsSync(cgPath)) {
    const guides = JSON.parse(fs.readFileSync(cgPath, "utf8"));
    for (const guide of guides) {
      const city = guide.category?.city;
      if (!city || city === "unknown") continue;
      if (!cityTexts.has(city)) cityTexts.set(city, []);

      // Build rich text with inline links highlighted
      let richText = `=== SOURCE: "${guide.title}" (city guide) ===\n`;
      if (guide.full_text && guide.full_text.length > 50) {
        richText += guide.full_text;
      }

      // Also extract inline link venue names (these are gold — explicitly tagged)
      const inlineVenues: string[] = [];
      for (const block of guide.text_blocks || []) {
        for (const link of block.inline_links || []) {
          if (
            link.text &&
            !link.text.match(
              /^(Share|Subscribe|Read|Check|Click|here|this|More|See|Watch|DM|TikTok|code\s)/i
            ) &&
            link.text.length > 2 &&
            link.text.length < 80
          ) {
            inlineVenues.push(link.text);
          }
        }
      }
      if (inlineVenues.length > 0) {
        richText += `\n\n=== INLINE LINKED VENUES (explicitly tagged in the post) ===\n${inlineVenues.join("\n")}`;
      }

      // Avoid adding duplicate content if already from recommendations_db
      const existing = cityTexts.get(city) || [];
      const isDuplicate = existing.some(
        (t) => t.includes(guide.title) || (guide.full_text && t.includes(guide.full_text.slice(0, 100)))
      );
      if (!isDuplicate) {
        cityTexts.get(city)!.push(richText);
      } else {
        // Still add the inline venues if we have them
        if (inlineVenues.length > 0) {
          cityTexts.get(city)!.push(
            `=== ADDITIONAL INLINE VENUES from "${guide.title}" ===\n${inlineVenues.join("\n")}`
          );
        }
      }
    }
  }

  // Source 3: multi-city guides (Euro Summer, Hotel Hit Lists) — extract per-city sections
  if (fs.existsSync(cgPath)) {
    const guides = JSON.parse(fs.readFileSync(cgPath, "utf8"));
    for (const guide of guides) {
      if (guide.category?.city !== "unknown") continue;
      if (!guide.full_text || guide.full_text.length < 100) continue;

      // These multi-city guides mention many cities — add to all matching cities
      const text = guide.full_text.toLowerCase();
      for (const city of Object.keys(CITY_MAP)) {
        const cityLower = city.toLowerCase();
        if (text.includes(cityLower) || (city === "Norway" && (text.includes("oslo") || text.includes("lofoten") || text.includes("bergen")))) {
          if (!cityTexts.has(city)) cityTexts.set(city, []);
          // Only add relevant chunks (text around city mentions)
          const chunks = extractCityChunks(guide.full_text, city);
          if (chunks.length > 0) {
            cityTexts.get(city)!.push(
              `=== SOURCE: "${guide.title}" (multi-city guide, ${city} sections) ===\n${chunks.join("\n\n")}`
            );
          }
        }
      }
    }
  }

  return cityTexts;
}

function extractCityChunks(text: string, city: string): string[] {
  const chunks: string[] = [];
  const aliases: Record<string, string[]> = {
    Norway: ["norway", "oslo", "bergen", "lofoten", "fjord"],
    Switzerland: ["switzerland", "swiss", "zermatt", "mürren", "murren"],
    "New York City": ["new york", "nyc", "manhattan", "brooklyn"],
    "Los Angeles": ["los angeles", "la", "hollywood", "malibu", "silver lake"],
    "San Francisco": ["san francisco", "sf"],
    "Upstate NY": ["upstate", "hudson", "catskills"],
  };

  const terms = aliases[city] || [city.toLowerCase()];
  const pattern = new RegExp(terms.map((t) => `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).join("|"), "gi");

  let match;
  const seen = new Set<number>();
  while ((match = pattern.exec(text)) !== null) {
    const start = Math.max(0, match.index - 500);
    const end = Math.min(text.length, match.index + 500);
    const bucket = Math.floor(match.index / 300);
    if (!seen.has(bucket)) {
      seen.add(bucket);
      chunks.push(text.slice(start, end).trim());
    }
  }
  return chunks;
}

// ── Claude venue extraction ──────────────────────────────────────

async function extractVenues(
  sourceText: string,
  cityNames: string[]
): Promise<ExtractedVenue[]> {
  const cityLabel = cityNames.join(" / ");

  // Truncate if too long for Claude (leave room for the prompt)
  const maxChars = 80000;
  const truncated =
    sourceText.length > maxChars
      ? sourceText.slice(0, maxChars) + "\n\n[... truncated ...]"
      : sourceText;

  console.log(
    `  Sending ${truncated.length} chars to Claude for ${cityLabel}...`
  );

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: `Extract every venue/place recommendation for ${cityLabel} from Denna's blog posts and newsletters below.

${truncated}

For each venue, output:
- name: exact name of the place (proper capitalization)
- category: one of: eat, drink, explore, shop, stay, spa
- subcategory: more specific (e.g., "italian", "cocktail bar", "museum", "boutique", "hotel", "bakery", "coffee")
- neighborhood: neighborhood/area if mentioned
- denna_note: Denna's exact words/sentiment. Quote her voice — keep phrases like "obsessed", "strict", "must go", "best ever", "dream of this", etc. Include specific dish/order recommendations. Combine notes if venue appears in multiple sources.
${cityNames.length > 1 ? `- city: which city among ${cityNames.join(", ")} this venue belongs to` : ""}

RULES:
- Only include actual named venues/places in ${cityLabel} (not brands, clothing items, or generic descriptions)
- Coffee shops/cafes = "drink" category
- Bakeries = "eat" with subcategory "bakery"
- Hotels = "stay" with subcategory "hotel"
- Wine bars = "drink" with subcategory "wine bar"
- Museums/galleries = "explore"
- If a venue appears multiple times, combine into one entry with the richest denna_note
- Do NOT include online stores, clothing brands without a physical location, or product recommendations
- Do NOT include cities/neighborhoods as venues unless they are specific places to visit
- Items in the "INLINE LINKED VENUES" sections are confirmed venue names — prioritize these

Output as a JSON array. Nothing else — no markdown fences, no explanation.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  let toParse = text.trim();
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    toParse = fenceMatch[1].trim();
  } else if (!toParse.startsWith("[")) {
    const bracketStart = text.indexOf("[");
    const bracketEnd = text.lastIndexOf("]");
    if (bracketStart >= 0 && bracketEnd > bracketStart) {
      toParse = text.slice(bracketStart, bracketEnd + 1);
    }
  }

  try {
    return JSON.parse(toParse);
  } catch (e: any) {
    // Recover truncated JSON
    const lastComplete = toParse.lastIndexOf("},");
    if (lastComplete > 0) {
      try {
        const venues = JSON.parse(toParse.slice(0, lastComplete + 1) + "]");
        console.log(`  Recovered ${venues.length} venues from truncated response`);
        return venues;
      } catch {}
    }
    const lastBrace = toParse.lastIndexOf("}");
    if (lastBrace > 0) {
      try {
        const venues = JSON.parse(toParse.slice(0, lastBrace + 1) + "]");
        console.log(`  Recovered ${venues.length} venues from truncated response`);
        return venues;
      } catch {}
    }
    console.error(`  Failed to parse response for ${cityLabel}: ${e.message}`);
    return [];
  }
}

// ── Deduplication ────────────────────────────────────────────────

function deduplicateVenues(venues: ExtractedVenue[]): ExtractedVenue[] {
  const seen = new Map<string, ExtractedVenue>();
  for (const v of venues) {
    const key = v.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = seen.get(key);
    if (existing) {
      if ((v.denna_note || "").length > (existing.denna_note || "").length) {
        seen.set(key, v);
      }
    } else {
      seen.set(key, v);
    }
  }
  return Array.from(seen.values());
}

// ── Google Places geocoding ──────────────────────────────────────

async function textSearch(query: string, lat?: number, lng?: number) {
  const params = new URLSearchParams({ query, key: GOOGLE_API_KEY });
  if (lat && lng) {
    params.set("location", `${lat},${lng}`);
    params.set("radius", "50000");
  }
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
  );
  const data = await res.json();
  return data.status === "OK" ? data.results : [];
}

async function getPlaceDetails(placeId: string) {
  const fields =
    "formatted_address,geometry,place_id,name,opening_hours,url,types,website";
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`
  );
  const data = await res.json();
  return data.status === "OK" ? data.result : null;
}

async function geocodeVenue(
  venueId: string,
  venueName: string,
  cityName: string
): Promise<boolean> {
  const center = CITY_CENTERS[cityName];
  try {
    const results = await textSearch(
      `${venueName}, ${cityName}`,
      center?.lat,
      center?.lng
    );
    await sleep(250);
    if (results.length === 0) return false;

    const best = results[0];
    const details = await getPlaceDetails(best.place_id);
    await sleep(250);

    const update: Record<string, any> = {
      lat: best.geometry?.location?.lat || null,
      lng: best.geometry?.location?.lng || null,
      address: details?.formatted_address || best.formatted_address || null,
      place_id: best.place_id || null,
      google_maps_url: details?.url || null,
      geocode_status: "verified",
    };
    if (details?.opening_hours?.weekday_text)
      update.opening_hours = details.opening_hours.weekday_text;
    if (details?.website) update.website = details.website;

    const { error } = await supabase
      .from("venues")
      .update(update)
      .eq("id", venueId);
    if (error) {
      console.log(`    Geocode error: ${error.message}`);
      return false;
    }
    console.log(
      `    -> ${details?.name || best.name} @ ${update.address?.slice(0, 60)}`
    );
    return true;
  } catch (err: any) {
    console.log(`    Geocode error: ${err.message}`);
    return false;
  }
}

// ── Process a single city ────────────────────────────────────────

async function processCity(
  sourceCity: string,
  texts: string[],
  doInsert: boolean
): Promise<{ inserted: number; geocoded: number }> {
  const supabaseCities = CITY_MAP[sourceCity] || [sourceCity];
  const combinedText = texts.join("\n\n");

  if (combinedText.length < 100) {
    console.log(`  Skipping ${sourceCity} — too little text (${combinedText.length} chars)`);
    return { inserted: 0, geocoded: 0 };
  }

  // Extract venues via Claude
  const rawVenues = await extractVenues(combinedText, supabaseCities);
  console.log(`  Claude extracted ${rawVenues.length} venues`);
  if (rawVenues.length === 0) return { inserted: 0, geocoded: 0 };

  const venues = deduplicateVenues(rawVenues);
  console.log(`  After dedup: ${venues.length} venues`);

  let totalInserted = 0;
  let totalGeocoded = 0;

  for (const cityName of supabaseCities) {
    const { data: city } = await supabase
      .from("cities")
      .select("id")
      .eq("city_name", cityName)
      .single();

    if (!city) {
      console.error(`  City "${cityName}" not found in Supabase`);
      continue;
    }

    // Filter for this city if multi-city
    let cityVenues = venues;
    if (supabaseCities.length > 1) {
      cityVenues = venues.filter((v) => {
        const vc = (v.city || "").toLowerCase();
        return vc.includes(cityName.toLowerCase()) || !v.city;
      });
    }

    // Get existing
    const { data: existing } = await supabase
      .from("venues")
      .select("name")
      .eq("city_id", city.id);

    const existingKeys = new Set(
      (existing || []).map((v: { name: string }) =>
        v.name.toLowerCase().replace(/[^a-z0-9]/g, "")
      )
    );

    const newVenues = cityVenues.filter(
      (v) => !existingKeys.has(v.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
    );

    console.log(
      `  ${cityName}: ${existingKeys.size} existing, ${newVenues.length} new, ${cityVenues.length - newVenues.length} already in DB`
    );

    if (newVenues.length === 0) continue;

    if (!doInsert) {
      for (const v of newVenues) {
        console.log(
          `    [${v.category}] ${v.name} — ${v.subcategory} — ${v.neighborhood || "?"}`
        );
        if (v.denna_note)
          console.log(`      "${v.denna_note.slice(0, 120)}"`);
      }
      continue;
    }

    // Insert
    const sourceTag = `text-guides-${sourceCity.toLowerCase().replace(/\s+/g, "-")}`;
    const rows = newVenues.map((v) => ({
      city_id: city.id,
      name: v.name,
      category: v.category,
      subcategory: v.subcategory,
      neighborhood: v.neighborhood || null,
      denna_note: v.denna_note || null,
      status: "active",
      source_posts: [sourceTag],
    }));

    for (let i = 0; i < rows.length; i += 20) {
      const batch = rows.slice(i, i + 20);
      const { data: insertedRows, error } = await supabase
        .from("venues")
        .insert(batch)
        .select("id, name");
      if (error) {
        console.error(`  Insert error (batch ${i / 20 + 1}):`, error.message);
      } else {
        console.log(`  Inserted batch ${i / 20 + 1} (${batch.length} venues)`);
        totalInserted += batch.length;

        // Geocode immediately
        if (insertedRows) {
          for (const row of insertedRows) {
            console.log(`    Geocoding ${row.name}...`);
            const ok = await geocodeVenue(row.id, row.name, cityName);
            if (ok) totalGeocoded++;
          }
        }
      }
    }

    // Update venue count
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

  return { inserted: totalInserted, geocoded: totalGeocoded };
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const doInsert = process.argv.includes("--insert");
  const cityFlag = process.argv.indexOf("--city");
  const cityFilter = cityFlag !== -1 ? process.argv[cityFlag + 1] : null;

  console.log("=== Text Guide Venue Extraction ===\n");
  console.log(
    doInsert
      ? "MODE: LIVE INSERT + GEOCODE\n"
      : "MODE: Dry run (pass --insert to write to Supabase)\n"
  );

  // Gather all city texts
  console.log("Gathering text from recommendations_db.json + city_guides.json...\n");
  const cityTexts = gatherCityTexts();

  // Sort by text length (richest content first)
  let entries = Array.from(cityTexts.entries())
    .map(([city, texts]) => ({
      city,
      texts,
      totalChars: texts.reduce((s, t) => s + t.length, 0),
    }))
    .filter((e) => e.totalChars > 100)
    .sort((a, b) => b.totalChars - a.totalChars);

  if (cityFilter) {
    entries = entries.filter((e) =>
      e.city.toLowerCase().includes(cityFilter.toLowerCase())
    );
  }

  console.log(`Processing ${entries.length} cities:\n`);
  for (const e of entries) {
    console.log(`  ${e.city}: ${e.texts.length} sources, ${e.totalChars} chars`);
  }
  console.log();

  let grandInserted = 0;
  let grandGeocoded = 0;

  for (const { city, texts, totalChars } of entries) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📍 ${city} (${texts.length} sources, ${totalChars} chars)`);
    console.log("=".repeat(60));

    const { inserted, geocoded } = await processCity(city, texts, doInsert);
    grandInserted += inserted;
    grandGeocoded += geocoded;
    await sleep(1000);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`DONE! Inserted: ${grandInserted}, Geocoded: ${grandGeocoded}`);
  console.log("=".repeat(60));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
