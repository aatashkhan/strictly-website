import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCityData } from "@/lib/venues";
import { buildSystemPrompt, buildTrimmedVenueContext } from "@/lib/prompts";
import { enrichItinerary } from "@/lib/routing";
import { getSiteContent } from "@/lib/siteContent";
import type { TripFormData, ItineraryData, ItineraryDay } from "@/lib/types";

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
  return "America/New_York";
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

/** Build a compact text representation of the itinerary (strips enrichment data) */
function compactItinerary(itinerary: ItineraryData): string {
  const lines: string[] = [];
  for (const day of itinerary.days) {
    lines.push(`Day ${day.day} — "${day.title}"`);
    for (let i = 0; i < day.items.length; i++) {
      const item = day.items[i];
      const time = item.endTime ? `${item.time}–${item.endTime}` : item.time;
      const dur = item.duration ? ` (${item.duration}min)` : "";
      lines.push(`  [${i}] ${time} | ${item.type} | ${item.name}${dur}`);
      lines.push(`       "${item.note}"`);
    }
    lines.push("");
  }
  return lines.join("\n");
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

    // Build a compact itinerary representation (much smaller than full JSON)
    const compactItin = compactItinerary(itinerary);

    // Dynamic refinement instructions
    const refinementPrompt = `You are now in REFINEMENT MODE. The traveler already has an itinerary and wants to modify it.

CURRENT ITINERARY (compact format):
${compactItin}
Intro: "${itinerary.intro}"
Signoff: "${itinerary.signoff}"

RULES FOR REFINEMENT:
- ONLY use venues from the database above
- Maintain Denna's voice throughout

RESPONSE FORMAT — FOLLOW THIS EXACTLY:

If MODIFYING the itinerary, respond in this format:

<explanation>1-2 sentences in Denna's voice about what you changed</explanation>
---JSON---
{"changedDays":[<only the day objects you changed>],"changedDayNumbers":[<list of day numbers that changed>]}

Each day object: { "day": 1, "title": "...", "items": [{ "time": "9:00 AM", "endTime": "10:30 AM", "type": "eat", "name": "Exact Venue Name", "note": "...", "duration": 90 }] }

CRITICAL: Only include the days you actually modified. Do NOT return unchanged days.

If NOT modifying the itinerary (just answering a question), respond conversationally without ---JSON---.${
      context?.currentTime || context?.currentLocation || (context?.completedItems && context.completedItems.length > 0)
        ? `

LIVE CONTEXT:${context.currentTime ? `\nCurrent time: ${new Date(context.currentTime).toLocaleString("en-US", { timeZone: getCityTimezone(tripData.city) })}` : ""}${context.currentLocation ? `\nUser location: ${context.currentLocation.lat.toFixed(4)}, ${context.currentLocation.lng.toFixed(4)}` : ""}${context.completedItems && context.completedItems.length > 0 ? `\nCompleted venues today: ${context.completedItems.join(", ")}` : ""}`
        : ""
    }`;

    // Build message history for multi-turn
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const msg of history.slice(0, -1)) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: message });

    // Stream the response using SSE
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let fullText = "";
          let hitSeparator = false;
          let conversationalPart = "";
          let jsonPart = "";

          const anthropicStream = client.messages.stream({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 4000,
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

          for await (const event of anthropicStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const chunk = event.delta.text;
              fullText += chunk;

              if (!hitSeparator) {
                if (fullText.includes("---JSON---")) {
                  hitSeparator = true;
                  const parts = fullText.split("---JSON---");
                  conversationalPart = parts[0];
                  jsonPart = parts[1] || "";
                } else {
                  sendEvent({ type: "text", content: chunk });
                }
              } else {
                jsonPart += chunk;
              }
            }
          }

          // Process the complete response
          if (hitSeparator && jsonPart.trim()) {
            try {
              const parsed = JSON.parse(jsonPart.trim());
              const changedDays: ItineraryDay[] = parsed.changedDays || parsed.days || [];
              const changedDayNumbers: number[] = parsed.changedDayNumbers || changedDays.map((d: ItineraryDay) => d.day);

              if (changedDays.length > 0 && changedDays.every((d: { items?: unknown }) => Array.isArray(d.items))) {
                // Merge changed days into full itinerary
                const mergedDays = itinerary.days.map(existingDay => {
                  const replacement = changedDays.find((d: ItineraryDay) => d.day === existingDay.day);
                  return replacement || existingDay;
                });

                // Handle added days (if Claude added a new day)
                for (const cd of changedDays) {
                  if (!mergedDays.find(d => d.day === cd.day)) {
                    mergedDays.push(cd);
                  }
                }
                mergedDays.sort((a, b) => a.day - b.day);

                const updatedItinerary: ItineraryData = {
                  intro: parsed.intro ?? itinerary.intro,
                  days: mergedDays,
                  signoff: parsed.signoff ?? itinerary.signoff,
                };

                const tripStartDate = tripData.arrival?.date ?? undefined;
                updatedItinerary.days = enrichItinerary(
                  updatedItinerary.days,
                  cityData.venues,
                  tripStartDate
                );

                sendEvent({ type: "itinerary", data: updatedItinerary, changedDays: changedDayNumbers });
              } else {
                sendEvent({
                  type: "text",
                  content: "\n\n(I tried to update your itinerary but the format came out wrong — try rephrasing your request.)",
                });
              }
            } catch {
              sendEvent({
                type: "text",
                content: "\n\n(I couldn\u2019t update the itinerary this time — try rephrasing your request.)",
              });
            }
          } else if (!hitSeparator) {
            // No separator found — check for fallback JSON extraction
            const firstBrace = fullText.indexOf('{');
            const lastBrace = fullText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
              const candidate = fullText.slice(firstBrace, lastBrace + 1);
              if (candidate.includes('"days"') || candidate.includes('"changedDays"')) {
                try {
                  const parsed = JSON.parse(candidate);
                  const changedDays = parsed.changedDays || parsed.days || [];
                  if (Array.isArray(changedDays) && changedDays.length > 0) {
                    const changedDayNumbers = parsed.changedDayNumbers || changedDays.map((d: ItineraryDay) => d.day);
                    const mergedDays = itinerary.days.map(existingDay => {
                      const replacement = changedDays.find((d: ItineraryDay) => d.day === existingDay.day);
                      return replacement || existingDay;
                    });
                    mergedDays.sort((a, b) => a.day - b.day);

                    const updatedItinerary: ItineraryData = {
                      intro: parsed.intro ?? itinerary.intro,
                      days: mergedDays,
                      signoff: parsed.signoff ?? itinerary.signoff,
                    };
                    const tripStartDate = tripData.arrival?.date ?? undefined;
                    updatedItinerary.days = enrichItinerary(
                      updatedItinerary.days,
                      cityData.venues,
                      tripStartDate
                    );
                    sendEvent({ type: "itinerary", data: updatedItinerary, changedDays: changedDayNumbers });
                  }
                } catch {
                  // fallback parse failed
                }
              }
            }
          }

          sendEvent({ type: "done", message: conversationalPart.trim() || fullText });
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          sendEvent({ type: "error", message: "Failed to process chat message." });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message." },
      { status: 500 }
    );
  }
}
