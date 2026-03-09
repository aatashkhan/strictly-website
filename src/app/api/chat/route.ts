import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCityData } from "@/lib/venues";
import { buildSystemPrompt } from "@/lib/prompts";
import { enrichItinerary } from "@/lib/routing";
import type { TripFormData, ItineraryData } from "@/lib/types";

const client = new Anthropic();

interface ChatRequest {
  message: string;
  itinerary: ItineraryData;
  tripData: TripFormData;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { message, itinerary, tripData, history } = body;

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
- Maintain Denna's voice throughout`;

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
