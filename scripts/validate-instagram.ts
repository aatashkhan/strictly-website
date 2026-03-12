/**
 * Instagram Link Validator
 *
 * Uses Instagram's oEmbed API to check if accounts actually exist.
 * Unlike fetching the profile page (which always returns HTTP 200 and renders
 * "sorry, this page isn't available" client-side via React), the oEmbed
 * endpoint returns real HTTP error codes for non-existent accounts.
 *
 * Usage: npx tsx scripts/validate-instagram.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 * Source them from .env.local or pass inline:
 *   source .env.local && npx tsx scripts/validate-instagram.ts
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

interface BrokenLink {
  venue_id: string;
  venue_name: string;
  city_name: string;
  instagram_url: string;
  status: number | "error";
  reason: string;
}

/**
 * Uses Instagram's oEmbed API to check if a profile actually exists.
 * Unlike the profile page (which always returns HTTP 200 and renders errors
 * client-side via React), the oEmbed endpoint returns real HTTP error codes:
 *   - 200 with JSON → account exists
 *   - 400 → account does not exist / "sorry, this page isn't available"
 *   - 404 → same, non-existent
 */
async function checkInstagramUrl(url: string): Promise<{ status: number | "error"; reason: string }> {
  try {
    // Normalize to a proper profile URL for the oEmbed lookup
    const profileUrl = url.startsWith("http")
      ? url
      : `https://www.instagram.com/${url.replace(/^@/, "")}/`;

    const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(profileUrl)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(oembedUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    clearTimeout(timeout);

    if (res.status === 200) {
      // oEmbed returned data — account exists
      return { status: 200, reason: "OK" };
    }

    if (res.status === 400 || res.status === 404) {
      return { status: res.status, reason: "Account does not exist (oEmbed 400/404)" };
    }

    if (res.status === 429) {
      return { status: 429, reason: "Rate limited — retry later" };
    }

    return { status: res.status, reason: `oEmbed HTTP ${res.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("abort")) {
      return { status: "error", reason: "Timeout (15s)" };
    }
    return { status: "error", reason: message };
  }
}

async function main() {
  console.log("Fetching venues with Instagram URLs...");

  const { data: venues, error } = await supabase
    .from("venues")
    .select("id, name, instagram, city_id")
    .not("instagram", "is", null)
    .neq("instagram", "");

  if (error) {
    console.error("Failed to fetch venues:", error);
    process.exit(1);
  }

  if (!venues || venues.length === 0) {
    console.log("No venues with Instagram URLs found.");
    return;
  }

  // Fetch city names
  const { data: cities } = await supabase.from("cities").select("id, city_name");
  const cityMap = new Map((cities || []).map((c: { id: string; city_name: string }) => [c.id, c.city_name]));

  console.log(`Found ${venues.length} venues with Instagram URLs. Checking...`);

  const broken: BrokenLink[] = [];
  const rateLimited: typeof venues = [];
  let checked = 0;

  for (const venue of venues) {
    checked++;
    const url = venue.instagram.startsWith("http")
      ? venue.instagram
      : `https://instagram.com/${venue.instagram.replace(/^@/, "")}`;

    const result = await checkInstagramUrl(url);

    if (result.status === 429) {
      // Save for retry after a longer pause
      rateLimited.push(venue);
    } else if (result.reason !== "OK") {
      broken.push({
        venue_id: venue.id,
        venue_name: venue.name,
        city_name: cityMap.get(venue.city_id) || "Unknown",
        instagram_url: url,
        status: result.status,
        reason: result.reason,
      });
    }

    if (checked % 25 === 0) {
      console.log(`  Checked ${checked}/${venues.length} (${broken.length} broken, ${rateLimited.length} rate-limited)...`);
    }

    // Rate limit: 1s between requests to stay under Instagram's limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Retry rate-limited URLs with longer delays
  if (rateLimited.length > 0) {
    console.log(`\nRetrying ${rateLimited.length} rate-limited URLs after 30s pause...`);
    await new Promise((resolve) => setTimeout(resolve, 30000));

    for (const venue of rateLimited) {
      const url = venue.instagram.startsWith("http")
        ? venue.instagram
        : `https://instagram.com/${venue.instagram.replace(/^@/, "")}`;

      const result = await checkInstagramUrl(url);
      if (result.reason !== "OK" && result.status !== 429) {
        broken.push({
          venue_id: venue.id,
          venue_name: venue.name,
          city_name: cityMap.get(venue.city_id) || "Unknown",
          instagram_url: url,
          status: result.status,
          reason: result.reason,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`\nDone! Checked ${checked} URLs.`);
  console.log(`Broken/problematic links: ${broken.length}`);

  const outputPath = path.join(process.cwd(), "scripts", "instagram-report.json");
  writeFileSync(outputPath, JSON.stringify({ checked, broken_count: broken.length, broken }, null, 2));
  console.log(`Report saved to: ${outputPath}`);

  if (broken.length > 0) {
    console.log("\nBroken links summary:");
    for (const b of broken) {
      console.log(`  - ${b.venue_name} (${b.city_name}): ${b.reason} — ${b.instagram_url}`);
    }
  }
}

main();
