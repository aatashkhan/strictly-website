/**
 * Instagram Link Validator
 *
 * Iterates through all venues with Instagram URLs, makes a HEAD request to each,
 * and outputs a report of broken links as JSON.
 *
 * Usage: npx tsx scripts/validate-instagram.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 * You can set them in .env.local or pass them inline:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/validate-instagram.ts
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

async function checkInstagramUrl(url: string): Promise<{ status: number | "error"; reason: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    clearTimeout(timeout);

    // Instagram returns 200 even for "page not available" sometimes,
    // but a 404 or redirect to login is a clear signal
    if (res.status === 404) {
      return { status: 404, reason: "Page not found" };
    }
    if (res.status === 302 || res.status === 301) {
      const location = res.headers.get("location") || "";
      if (location.includes("/accounts/login")) {
        return { status: res.status, reason: "Redirects to login (likely deleted/private)" };
      }
    }
    if (res.status >= 400) {
      return { status: res.status, reason: `HTTP ${res.status}` };
    }

    // For 200 responses, do a GET to check for "page isn't available" text
    if (res.status === 200) {
      const getRes = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const body = await getRes.text();
      if (body.includes("Sorry, this page isn") || body.includes("this page is not available")) {
        return { status: 200, reason: "Page not available (soft 404)" };
      }
    }

    return { status: res.status, reason: "OK" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("abort")) {
      return { status: "error", reason: "Timeout (10s)" };
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
  let checked = 0;

  for (const venue of venues) {
    checked++;
    const url = venue.instagram.startsWith("http")
      ? venue.instagram
      : `https://instagram.com/${venue.instagram.replace(/^@/, "")}`;

    const result = await checkInstagramUrl(url);

    if (result.reason !== "OK") {
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
      console.log(`  Checked ${checked}/${venues.length} (${broken.length} broken so far)...`);
    }

    // Rate limit: wait 500ms between requests to avoid being blocked
    await new Promise((resolve) => setTimeout(resolve, 500));
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
