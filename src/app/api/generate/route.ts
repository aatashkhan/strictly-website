import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getCityData } from "@/lib/venues";
import { buildSystemPrompt, buildVenueContext, buildUserPrompt } from "@/lib/prompts";
import { enrichItinerary } from "@/lib/routing";
import { getSiteContent } from "@/lib/siteContent";
import type { TripFormData, ItineraryData, Venue } from "@/lib/types";

const client = new Anthropic();

const EMAILS_FILE = path.join(process.cwd(), "src", "data", "emails.json");

async function storeEmail(email: string, city: string): Promise<boolean> {
  if (!email) return false;

  try {
    let emails: Array<{ email: string; city: string; timestamp: string }> = [];
    try {
      const raw = await fs.readFile(EMAILS_FILE, "utf-8");
      emails = JSON.parse(raw);
    } catch {
      // file doesn't exist yet
    }

    emails.push({ email, city, timestamp: new Date().toISOString() });
    await fs.writeFile(EMAILS_FILE, JSON.stringify(emails, null, 2));
    return true;
  } catch (err) {
    console.error("Failed to store email:", err);
    return false;
  }
}

/** Save Claude's generated venue notes to ai_generated_note (only if field is empty) */
async function saveVenueBlurbs(itinerary: ItineraryData, venues: Venue[]) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) return;

  const supabase = createClient(url, serviceKey);

  for (const day of itinerary.days) {
    for (const item of day.items) {
      if (!item.note || !item.venueId) continue;
      // Only save if the venue doesn't already have an ai_generated_note
      const venue = venues.find(v => v.id === item.venueId);
      if (venue?.ai_generated_note) continue;

      await supabase
        .from("venues")
        .update({ ai_generated_note: item.note })
        .eq("id", item.venueId)
        .is("ai_generated_note", null);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TripFormData;
    const { city, email } = body;

    // Store email if provided (non-blocking, but logged on failure)
    if (email) {
      storeEmail(email, city);
    }

    const cityData = await getCityData(city);
    if (!cityData) {
      return NextResponse.json(
        { error: `City "${city}" not found in our database.` },
        { status: 400 }
      );
    }

    // Filter out closed venues before prompt construction and enrichment
    const activeVenues = cityData.venues.filter(v => v.status !== 'closed');
    const activeCityData = { ...cityData, venues: activeVenues, venue_count: activeVenues.length };

    // Load voice settings from database (falls back to defaults if table doesn't exist)
    let voiceSettings;
    try {
      voiceSettings = await getSiteContent("ai_voice");
    } catch {
      voiceSettings = undefined;
    }
    const systemPrompt = buildSystemPrompt(voiceSettings && Object.keys(voiceSettings).length > 0 ? voiceSettings : undefined);
    const venueContext = buildVenueContext(activeCityData, body.hotel?.name);
    const userPrompt = buildUserPrompt(body, activeCityData);

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { type: "ephemeral" as const },
        },
        {
          type: "text" as const,
          text: venueContext,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const itinerary: ItineraryData = JSON.parse(text);

    // Post-process: match venues, calculate travel, validate hours, optimize route order
    const tripStartDate = body.arrival?.date ?? undefined;
    itinerary.days = enrichItinerary(
      itinerary.days,
      activeVenues,
      tripStartDate,
      body.hotel?.lat,
      body.hotel?.lng,
      body.transitPreference
    );

    // 2F: Save Claude's generated venue blurbs (non-blocking, best-effort)
    saveVenueBlurbs(itinerary, activeVenues).catch(err =>
      console.error("Failed to save venue blurbs:", err)
    );

    return NextResponse.json(itinerary);
  } catch (error) {
    console.error("Error generating itinerary:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse itinerary response from AI." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate itinerary. Please try again." },
      { status: 500 }
    );
  }
}
