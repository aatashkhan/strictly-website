/**
 * Instagram Link Validator
 *
 * Checks if each venue's Instagram account actually exists by using
 * Instagram's web_profile_info API, which returns 404 for dead accounts
 * (unlike the profile page which always returns 200).
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/validate-instagram.ts          # dry run
 *   npx dotenv -e .env.local -- npx tsx scripts/validate-instagram.ts --fix    # remove dead links
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const fix = process.argv.includes("--fix");

interface BrokenLink {
  venue_id: string;
  venue_name: string;
  city_name: string;
  instagram_raw: string;
  username: string;
  status: number | "error";
  reason: string;
}

/** Normalize instagram field to a clean username */
function normalizeUsername(raw: string): string {
  let username = raw.trim();
  // Strip full URLs
  username = username.replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
  // Strip trailing slash and query params
  username = username.replace(/[\/?#].*$/, "");
  // Strip @ prefix
  username = username.replace(/^@/, "");
  return username;
}

/**
 * Check if an Instagram username resolves to a real account.
 * Uses the oEmbed API which reliably returns 200 for valid and 404 for dead accounts
 * from server-side Node.js (unlike web_profile_info which requires browser cookies).
 */
async function checkAccount(username: string): Promise<{ valid: boolean; status: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const profileUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
    const res = await fetch(
      `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(profileUrl)}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);
    return { valid: res.status === 200, status: res.status };
  } catch {
    return { valid: false, status: 0 };
  }
}

async function main() {
  console.log(`Instagram link validator (${fix ? "FIX mode — will remove dead links" : "DRY RUN — report only"})\n`);

  // Fetch all venues with instagram set
  // Try with deleted_at filter; fall back if column doesnt exist yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any = await supabase
    .from("venues")
    .select("id, name, instagram, city_id")
    .not("instagram", "is", null)
    .neq("instagram", "")
    .is("deleted_at", null);

  if (result.error?.code === "42703") {
    console.log("(deleted_at column not found — skipping soft-delete filter)\n");
    result = await supabase
      .from("venues")
      .select("id, name, instagram, city_id")
      .not("instagram", "is", null)
      .neq("instagram", "");
  }

  const { data: venues, error } = result;

  if (error) {
    console.error("Failed to fetch venues:", error);
    process.exit(1);
  }

  if (!venues || venues.length === 0) {
    console.log("No venues with Instagram links found.");
    return;
  }

  // Fetch city names
  const { data: cities } = await supabase.from("cities").select("id, city_name");
  const cityMap = new Map((cities || []).map((c: { id: string; city_name: string }) => [c.id, c.city_name]));

  console.log(`Found ${venues.length} venues with Instagram links. Checking...\n`);

  const broken: BrokenLink[] = [];
  const malformed: BrokenLink[] = [];
  const rateLimited: typeof venues = [];
  let checked = 0;

  for (const venue of venues) {
    checked++;
    const username = normalizeUsername(venue.instagram);
    const cityName = cityMap.get(venue.city_id) || "Unknown";

    if (!username || username.includes(" ") || username.length > 30) {
      malformed.push({
        venue_id: venue.id,
        venue_name: venue.name,
        city_name: cityName,
        instagram_raw: venue.instagram,
        username,
        status: "error",
        reason: "Malformed username",
      });
      console.log(`  MALFORMED  ${venue.name} (${cityName}) — "${venue.instagram}"`);
      continue;
    }

    const { valid, status } = await checkAccount(username);

    if (status === 429) {
      rateLimited.push(venue);
      console.log(`  RATE LIMITED  ${venue.name} (${cityName}) — @${username}`);
    } else if (!valid) {
      broken.push({
        venue_id: venue.id,
        venue_name: venue.name,
        city_name: cityName,
        instagram_raw: venue.instagram,
        username,
        status,
        reason: status === 404 ? "Account not found" : `HTTP ${status}`,
      });
      console.log(`  DEAD [${status}]  ${venue.name} (${cityName}) — @${username}`);
    }

    if (checked % 50 === 0) {
      console.log(`  ... checked ${checked}/${venues.length}`);
    }

    // Rate limit: ~2 requests per second
    await new Promise((r) => setTimeout(r, 500));
  }

  // Retry rate-limited URLs
  if (rateLimited.length > 0) {
    console.log(`\nRetrying ${rateLimited.length} rate-limited URLs after 60s pause...`);
    await new Promise((r) => setTimeout(r, 60000));

    for (const venue of rateLimited) {
      const username = normalizeUsername(venue.instagram);
      const cityName = cityMap.get(venue.city_id) || "Unknown";
      const { valid, status } = await checkAccount(username);

      if (!valid && status !== 429) {
        broken.push({
          venue_id: venue.id,
          venue_name: venue.name,
          city_name: cityName,
          instagram_raw: venue.instagram,
          username,
          status,
          reason: status === 404 ? "Account not found" : `HTTP ${status}`,
        });
      }

      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Report
  const allBad = [...broken, ...malformed];

  console.log(`\n--- Results ---`);
  console.log(`Total checked: ${checked}`);
  console.log(`Dead accounts: ${broken.length}`);
  console.log(`Malformed entries: ${malformed.length}`);

  // Save report
  const outputPath = path.join(process.cwd(), "scripts", "instagram-report.json");
  writeFileSync(outputPath, JSON.stringify({ checked, broken_count: broken.length, malformed_count: malformed.length, broken, malformed }, null, 2));
  console.log(`Report saved to: ${outputPath}`);

  if (broken.length > 0) {
    console.log(`\nDead accounts:`);
    for (const b of broken) {
      console.log(`  - ${b.venue_name} (${b.city_name}): @${b.username}`);
    }
  }

  if (malformed.length > 0) {
    console.log(`\nMalformed entries:`);
    for (const m of malformed) {
      console.log(`  - ${m.venue_name} (${m.city_name}): "${m.instagram_raw}"`);
    }
  }

  // Fix mode: remove dead links from DB
  if (fix && allBad.length > 0) {
    console.log(`\nRemoving instagram from ${allBad.length} venues...`);

    for (const v of allBad) {
      const { error: updateErr } = await supabase
        .from("venues")
        .update({ instagram: null })
        .eq("id", v.venue_id);

      if (updateErr) {
        console.error(`  Failed to update ${v.venue_name}: ${updateErr.message}`);
      } else {
        console.log(`  Cleaned: ${v.venue_name}`);
      }
    }

    console.log("\nDone! Dead links removed from database.");
  } else if (allBad.length > 0) {
    console.log(`\nRun with --fix to remove dead/malformed links from the database.`);
  } else {
    console.log("\nAll Instagram links are valid!");
  }
}

main().catch(console.error);
