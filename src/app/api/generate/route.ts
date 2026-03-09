import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { getCityData } from "@/lib/venues";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import { enrichItinerary } from "@/lib/routing";
import type { TripFormData, ItineraryData } from "@/lib/types";

const client = new Anthropic();

const EMAILS_FILE = path.join(process.cwd(), "src", "data", "emails.json");

async function storeEmail(email: string, city: string) {
  if (!email) return;

  let emails: Array<{ email: string; city: string; timestamp: string }> = [];
  try {
    const raw = await fs.readFile(EMAILS_FILE, "utf-8");
    emails = JSON.parse(raw);
  } catch {
    // file doesn't exist yet
  }

  emails.push({ email, city, timestamp: new Date().toISOString() });
  await fs.writeFile(EMAILS_FILE, JSON.stringify(emails, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TripFormData;
    const { city, email } = body;

    // Store email if provided
    if (email) {
      storeEmail(email, city).catch((err) =>
        console.error("Failed to store email:", err)
      );
    }

    const cityData = getCityData(city);
    if (!cityData) {
      return NextResponse.json(
        { error: `City "${city}" not found in our database.` },
        { status: 400 }
      );
    }

    // Filter out closed venues before prompt construction and enrichment
    const activeVenues = cityData.venues.filter(v => v.status !== 'closed');
    const activeCityData = { ...cityData, venues: activeVenues, venue_count: activeVenues.length };

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(body, activeCityData);

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: systemPrompt,
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
