import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCityData } from "@/lib/venues";
import { buildSystemPrompt, buildTrimmedVenueContext } from "@/lib/prompts";
import { enrichItinerary } from "@/lib/routing";
import { getSiteContent } from "@/lib/siteContent";
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

/**
 * Try to extract a JSON object from text that might contain markdown code fences
 * or have the JSON embedded in conversational text.
 */
function extractJsonFromText(text: string): string | null {
  // Try code fence extraction first: ```json ... ``` or ``` ... ```
  const codeFenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeFenceMatch) {
    const inner = codeFenceMatch[1].trim();
    if (inner.startsWith('{')) return inner;
  }

  // Try to find a JSON object by matching outermost braces
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    // Quick sanity check: must have "days" key
    if (candidate.includes('"days"')) return candidate;
  }

  return null;
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

    const cityData = await getCityData(tripData.city);
    if (!cityData) {
      return NextResponse.json(
        { error: `City "${tripData.city}" not found.` },
        { status: 400 }
      );
    }

    let voiceSettings;
    try {
      voiceSettings = await getSiteContent("ai_voice");
    } catch {
      voiceSettings = undefined;
    }
    const baseSystemPrompt = buildSystemPrompt(voiceSettings && Object.keys(voiceSettings).length > 0 ? voiceSettings : undefined);

    // Extract venue names from the current itinerary for trimmed context
    const itineraryVenueNames: string[] = [];
    for (const day of itinerary.days) {
      for (const item of day.items) {
        if (item.name) itineraryVenueNames.push(item.name);
      }
    }
    const venueContext = buildTrimmedVenueContext(cityData, itineraryVenueNames, tripData.hotel?.name);

    // Dynamic refinement instructions (changes per request — not cached)
    const refinementPrompt = `You are now in REFINEMENT MODE. The traveler already has an itinerary and wants to modify it.

CURRENT ITINERARY:
${JSON.stringify(itinerary, null, 2)}

RULES FOR REFINEMENT:
- When the user asks for changes, apply them to the current itinerary
- ONLY use venues from the database above
- Keep the same JSON format: { "intro": "...", "days": [...], "signoff": "..." }
- Maintain Denna's voice throughout
- Support action commands: skip a venue, add a venue, reorder stops, adjust times

CRITICAL RESPONSE FORMAT — YOU MUST FOLLOW THIS EXACTLY:

If you are MODIFYING the itinerary, respond in EXACTLY this format:

<explanation>1-3 sentences in Denna's voice about what you changed</explanation>
---JSON---
{"intro":"...","days":[...],"signoff":"..."}

Rules:
- The separator MUST be exactly: ---JSON---  (three dashes, the word JSON, three dashes, on its own line)
- After ---JSON--- output ONLY raw JSON. No markdown, no backticks, no explanation.
- The JSON must be the COMPLETE updated itinerary with ALL days and items, not just the changed parts.
- The JSON format is: { "intro": "...", "days": [{ "day": 1, "title": "...", "items": [{ "time": "9:00 AM", "endTime": "10:30 AM", "type": "eat", "name": "Exact Venue Name", "note": "...", "duration": 90 }] }], "signoff": "..." }

If you are NOT modifying the itinerary (just answering a question), respond conversationally. Do NOT include ---JSON--- in conversational responses.${
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      system: [
        {
          type: "text" as const,
          text: baseSystemPrompt,
          cache_control: { type: "ephemeral" as const },
        },
        {
          type: "text" as const,
          text: venueContext,
          cache_control: { type: "ephemeral" as const },
        },
        {
          type: "text" as const,
          text: refinementPrompt,
        },
      ],
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

    // Fallback: try to extract JSON even without the separator
    // The AI might have wrapped it in code fences or just output JSON directly
    const fallbackJson = extractJsonFromText(text);
    if (fallbackJson) {
      try {
        const parsed = JSON.parse(fallbackJson);
        if (parsed && Array.isArray(parsed.days) && parsed.days.length > 0 &&
            parsed.days.every((d: { items?: unknown }) => Array.isArray(d.items))) {
          const updatedItinerary: ItineraryData = {
            intro: parsed.intro ?? itinerary.intro,
            days: parsed.days,
            signoff: parsed.signoff ?? itinerary.signoff,
          };
          const tripStartDate = tripData.arrival?.date ?? undefined;
          updatedItinerary.days = enrichItinerary(
            updatedItinerary.days,
            cityData.venues,
            tripStartDate
          );
          // Extract conversational part (text before JSON)
          const jsonStart = text.indexOf(fallbackJson);
          const conversational = jsonStart > 0 ? text.slice(0, jsonStart).replace(/```json?\s*/gi, '').trim() : "";
          return NextResponse.json({
            message: conversational || "Done! I've updated your itinerary.",
            updatedItinerary,
          });
        }
      } catch {
        // fallback parse failed, treat as conversation
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
