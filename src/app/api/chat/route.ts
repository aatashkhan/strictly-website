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

If MODIFYING the itinerary, output JSON FIRST, then explanation:
---JSON---
[{"day":2,"title":"Day Title","items":[{"time":"9:00 AM","endTime":"10:30 AM","type":"eat","name":"Venue Name","note":"Denna's note about it","duration":90}]}]
---END---
One sentence about what you changed, in Denna's voice.

RULES:
- Start your response with ---JSON--- immediately (no text before it)
- Only include days you actually changed, not all days
- JSON is a plain array: [{"day":N,"title":"...","items":[...]}]
- Each item needs: time, type, name, note. Optional: endTime, duration
- No markdown, no backticks around the JSON
- After ---END--- write exactly one sentence explaining the change

If NOT modifying (just answering a question), respond conversationally. Do not include ---JSON---.${
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
          let inJson = false;
          let pastJson = false;
          let jsonPart = "";
          let explanationPart = "";

          const anthropicStream = client.messages.stream({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 6000,
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

              if (!inJson && !pastJson) {
                // Haven't entered JSON block yet
                if (fullText.includes("---JSON---")) {
                  inJson = true;
                  jsonPart = fullText.split("---JSON---")[1] || "";
                  // Check if ---END--- is already in this chunk
                  if (jsonPart.includes("---END---")) {
                    const endParts = jsonPart.split("---END---");
                    jsonPart = endParts[0];
                    explanationPart = endParts[1] || "";
                    inJson = false;
                    pastJson = true;
                  }
                } else {
                  // No JSON separator — this is conversational text, stream it
                  sendEvent({ type: "text", content: chunk });
                }
              } else if (inJson) {
                // Inside JSON block — accumulate silently
                jsonPart += chunk;
                // Check if ---END--- has appeared
                if (jsonPart.includes("---END---")) {
                  const endParts = jsonPart.split("---END---");
                  jsonPart = endParts[0];
                  explanationPart = endParts[1] || "";
                  inJson = false;
                  pastJson = true;
                }
              } else {
                // Past the JSON block — stream the explanation
                explanationPart += chunk;
                sendEvent({ type: "text", content: chunk });
              }
            }
          }

          // Process the response
          const hasJson = fullText.includes("---JSON---");
          // If model didn't use ---END---, grab everything after JSON separator
          if (hasJson && !jsonPart && !pastJson) {
            jsonPart = fullText.split("---JSON---")[1] || "";
          }

          if (hasJson && jsonPart.trim()) {
            try {
              // Strip markdown fences, ---END--- remnants, trailing explanation
              let jsonStr = jsonPart.trim();
              jsonStr = jsonStr.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
              jsonStr = jsonStr.replace(/---END---[\s\S]*$/, "").trim();

              const parsed = JSON.parse(jsonStr);

              // Support array, object wrapper, or single day
              let changedDays: ItineraryDay[];
              if (Array.isArray(parsed)) {
                changedDays = parsed;
              } else if (parsed.changedDays) {
                changedDays = parsed.changedDays;
              } else if (parsed.days) {
                changedDays = parsed.days;
              } else if (parsed.day && parsed.items) {
                changedDays = [parsed];
              } else {
                changedDays = [];
              }

              const changedDayNumbers: number[] = changedDays.map((d: ItineraryDay) => d.day);

              if (changedDays.length > 0 && changedDays.every((d: { items?: unknown }) => Array.isArray(d.items))) {
                // Merge changed days into full itinerary
                const mergedDays = itinerary.days.map(existingDay => {
                  const replacement = changedDays.find((d: ItineraryDay) => d.day === existingDay.day);
                  return replacement || existingDay;
                });

                // Handle added days
                for (const cd of changedDays) {
                  if (!mergedDays.find(d => d.day === cd.day)) {
                    mergedDays.push(cd);
                  }
                }
                mergedDays.sort((a, b) => a.day - b.day);

                const updatedItinerary: ItineraryData = {
                  intro: itinerary.intro,
                  days: mergedDays,
                  signoff: itinerary.signoff,
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
            } catch (parseErr) {
              console.error("JSON parse error:", parseErr, "Raw JSON:", jsonPart.trim().slice(0, 500));
              sendEvent({
                type: "text",
                content: "\n\n(I couldn\u2019t update the itinerary this time — try rephrasing your request.)",
              });
            }
          } else if (!hasJson) {
            // No JSON separator at all — try fallback extraction
            const firstBracket = fullText.indexOf('[');
            const lastBracket = fullText.lastIndexOf(']');
            const firstBrace = fullText.indexOf('{');
            const lastBrace = fullText.lastIndexOf('}');

            let candidate = "";
            if (firstBracket !== -1 && lastBracket > firstBracket) {
              candidate = fullText.slice(firstBracket, lastBracket + 1);
            } else if (firstBrace !== -1 && lastBrace > firstBrace) {
              candidate = fullText.slice(firstBrace, lastBrace + 1);
            }

            if (candidate && (candidate.includes('"day"') || candidate.includes('"days"'))) {
              try {
                const parsed = JSON.parse(candidate);
                const changedDays: ItineraryDay[] = Array.isArray(parsed)
                  ? parsed
                  : (parsed.changedDays || parsed.days || (parsed.day && parsed.items ? [parsed] : []));

                if (changedDays.length > 0) {
                  const changedDayNumbers = changedDays.map((d: ItineraryDay) => d.day);
                  const mergedDays = itinerary.days.map(existingDay => {
                    const replacement = changedDays.find((d: ItineraryDay) => d.day === existingDay.day);
                    return replacement || existingDay;
                  });
                  mergedDays.sort((a, b) => a.day - b.day);

                  const updatedItinerary: ItineraryData = {
                    intro: itinerary.intro,
                    days: mergedDays,
                    signoff: itinerary.signoff,
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

          // Send the explanation text as the final message
          const finalMsg = explanationPart.trim() || (hasJson ? "" : fullText);
          sendEvent({ type: "done", message: finalMsg });
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
