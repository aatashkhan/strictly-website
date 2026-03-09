import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCityData } from "@/lib/venues";
import { buildSystemPrompt } from "@/lib/prompts";
import { enrichItinerary } from "@/lib/routing";
import type { TripFormData, ItineraryData } from "@/lib/types";

const client = new Anthropic();

function getCityTimezone(city: string): string {
  const lower = city.toLowerCase();
  const timezones: Record<string, string> = {
    london: "Europe/London",
    paris: "Europe/Paris",
    rome: "Europe/Rome",
    tokyo: "Asia/Tokyo",
    kyoto: "Asia/Tokyo",
    osaka: "Asia/Tokyo",
    "mexico city": "America/Mexico_City",
    tulum: "America/Cancun",
    "los angeles": "America/Los_Angeles",
    la: "America/Los_Angeles",
    "new york": "America/New_York",
    nyc: "America/New_York",
    miami: "America/New_York",
    nashville: "America/Chicago",
    austin: "America/Chicago",
    chicago: "America/Chicago",
    denver: "America/Denver",
    "san francisco": "America/Los_Angeles",
    seattle: "America/Los_Angeles",
    portland: "America/Los_Angeles",
    charleston: "America/New_York",
    lisbon: "Europe/Lisbon",
    barcelona: "Europe/Madrid",
    amsterdam: "Europe/Amsterdam",
    berlin: "Europe/Berlin",
    copenhagen: "Europe/Copenhagen",
    marrakech: "Africa/Casablanca",
    bali: "Asia/Makassar",
    bangkok: "Asia/Bangkok",
    sydney: "Australia/Sydney",
    "buenos aires": "America/Argentina/Buenos_Aires",
  };
  for (const [key, tz] of Object.entries(timezones)) {
    if (lower.includes(key)) return tz;
  }
  return "America/New_York"; // fallback
}

interface ChatContext {
  currentLocation?: { lat: number; lng: number } | null;
  currentTime?: string;
  completedItems?: string[];
}

interface ChatRequest {
  message: string;
  itinerary: ItineraryData;
  tripData: TripFormData;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  context?: ChatContext;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { message, itinerary, tripData, history, context } = body;

    if (!message || !itinerary || !tripData || !tripData.city) {
      return NextResponse.json(
        { error: "Missing required fields: message, itinerary, and tripData are required." },
        { status: 400 }
      );
    }

    const cityData = getCityData(tripData.city);
    if (!cityData) {
      return NextResponse.json(
        { error: `City "${tripData.city}" not found.` },
        { status: 400 }
      );
    }

    const systemPrompt = `${buildSystemPrompt()}

You are now in REFINEMENT MODE. The traveler already has an itinerary and wants to modify it.

CURRENT ITINERARY:
${JSON.stringify(itinerary, null, 2)}

AVAILABLE VENUES FOR ${cityData.city_name}:
${cityData.venues.map((v) => `- ${v.name} [${v.category}] ${v.neighborhood ?? ""} ${v.address ?? ""}`).join("\n")}

RULES FOR REFINEMENT:
- When the user asks for changes, apply them to the current itinerary
- ONLY use venues from the database above
- Keep the same JSON format: { "intro": "...", "days": [...], "signoff": "..." }
- Respond with TWO parts separated by "---JSON---":
  1. First: a brief, warm conversational response in Denna's voice explaining what you changed (1-3 sentences)
  2. Then the separator "---JSON---"
  3. Then the complete updated itinerary as raw JSON
- If the user's request doesn't require itinerary changes (just a question), respond conversationally WITHOUT the JSON section
- Maintain Denna's voice throughout
- Support action commands: skip a venue, add a venue, reorder stops, adjust times${
      context?.currentTime || context?.currentLocation || (context?.completedItems && context.completedItems.length > 0)
        ? `

LIVE CONTEXT:${context.currentTime ? `\nCurrent time: ${new Date(context.currentTime).toLocaleString("en-US", { timeZone: getCityTimezone(tripData.city) })}` : ""}${context.currentLocation ? `\nUser location: ${context.currentLocation.lat.toFixed(4)}, ${context.currentLocation.lng.toFixed(4)}` : ""}${context.completedItems && context.completedItems.length > 0 ? `\nCompleted venues today: ${context.completedItems.join(", ")}` : ""}`
        : ""
    }`;

    // Build message history for multi-turn
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const msg of history.slice(0, -1)) {
      // Strip any JSON from assistant messages for context (keep it concise)
      const content =
        msg.role === "assistant"
          ? msg.content
          : msg.content;
      messages.push({ role: msg.role, content });
    }
    messages.push({ role: "user", content: message });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: systemPrompt,
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Check if response contains updated itinerary
    if (text.includes("---JSON---")) {
      const [conversational, jsonPart] = text.split("---JSON---");
      const trimmedJson = jsonPart.trim();

      try {
        const parsed = JSON.parse(trimmedJson);

        // Validate structure before using
        if (
          !parsed ||
          !Array.isArray(parsed.days) ||
          parsed.days.length === 0 ||
          !parsed.days.every((d: { items?: unknown }) => Array.isArray(d.items))
        ) {
          // Malformed itinerary — return just the conversation
          return NextResponse.json({
            message: (conversational.trim() || text) +
              "\n\n(I tried to update your itinerary but the format came out wrong — try rephrasing your request.)",
            updatedItinerary: null,
          });
        }

        const updatedItinerary: ItineraryData = {
          intro: parsed.intro ?? itinerary.intro,
          days: parsed.days,
          signoff: parsed.signoff ?? itinerary.signoff,
        };

        // Re-enrich with venue matching, travel, hours validation
        const tripStartDate = tripData.arrival?.date ?? undefined;
        updatedItinerary.days = enrichItinerary(
          updatedItinerary.days,
          cityData.venues,
          tripStartDate
        );

        return NextResponse.json({
          message: conversational.trim(),
          updatedItinerary,
        });
      } catch {
        // JSON parse failed — return just the conversation with a note
        return NextResponse.json({
          message: (conversational.trim() || text) +
            "\n\n(I couldn\u2019t update the itinerary this time — try rephrasing your request.)",
          updatedItinerary: null,
        });
      }
    }

    // No itinerary update — just conversation
    return NextResponse.json({
      message: text,
      updatedItinerary: null,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message." },
      { status: 500 }
    );
  }
}
