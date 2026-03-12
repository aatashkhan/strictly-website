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

// Estimate expected tokens based on trip duration
function estimateExpectedTokens(duration: string): number {
  const days = parseInt(duration) || 2;
  // ~1500 tokens per day of itinerary + ~500 for intro/signoff
  return days * 1500 + 500;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TripFormData;
    const { city, email } = body;

    // Check if client wants streaming (Accept header or query param)
    const wantsStream = request.headers.get("accept")?.includes("text/event-stream");

    // Store email if provided (non-blocking)
    if (email) {
      storeEmail(email, city);
    }

    const cityData = await getCityData(city);
    if (!cityData) {
      if (wantsStream) {
        return new Response(
          `data: ${JSON.stringify({ type: "error", message: `City "${city}" not found in our database.` })}\n\n`,
          { headers: { "Content-Type": "text/event-stream" } }
        );
      }
      return NextResponse.json(
        { error: `City "${city}" not found in our database.` },
        { status: 400 }
      );
    }

    const activeVenues = cityData.venues.filter(v => v.status !== 'closed');
    const activeCityData = { ...cityData, venues: activeVenues, venue_count: activeVenues.length };

    let voiceSettings;
    try {
      voiceSettings = await getSiteContent("ai_voice");
    } catch {
      voiceSettings = undefined;
    }
    const systemPrompt = buildSystemPrompt(voiceSettings && Object.keys(voiceSettings).length > 0 ? voiceSettings : undefined);
    const venueContext = buildVenueContext(activeCityData, body.hotel?.name);
    const userPrompt = buildUserPrompt(body, activeCityData);

    // Non-streaming path (backwards compatible)
    if (!wantsStream) {
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

      const tripStartDate = body.arrival?.date ?? undefined;
      itinerary.days = enrichItinerary(
        itinerary.days,
        activeVenues,
        tripStartDate,
        body.hotel?.lat,
        body.hotel?.lng,
        body.transitPreference
      );

      saveVenueBlurbs(itinerary, activeVenues).catch(err =>
        console.error("Failed to save venue blurbs:", err)
      );

      return NextResponse.json(itinerary);
    }

    // Streaming path — SSE with progress events
    const encoder = new TextEncoder();
    const expectedTokens = estimateExpectedTokens(body.duration);

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Phase 1: Setup complete (10%)
          sendEvent({ type: "progress", percent: 10, phase: "Building your prompt..." });

          // Phase 2: Stream from Claude (10% → 85%)
          let fullText = "";
          let tokenCount = 0;
          let lastProgressPercent = 10;

          const anthropicStream = client.messages.stream({
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

          for await (const event of anthropicStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              fullText += event.delta.text;
              tokenCount += event.delta.text.length / 4; // rough char-to-token estimate

              // Send progress updates every ~2% to avoid flooding
              const rawPercent = 10 + (tokenCount / expectedTokens) * 75;
              const percent = Math.min(85, Math.round(rawPercent));
              if (percent > lastProgressPercent + 1) {
                lastProgressPercent = percent;
                sendEvent({ type: "progress", percent });
              }
            }
          }

          // Phase 3: Post-processing (85% → 95%)
          sendEvent({ type: "progress", percent: 88, phase: "Matching venues..." });

          const itinerary: ItineraryData = JSON.parse(fullText);

          const tripStartDate = body.arrival?.date ?? undefined;
          itinerary.days = enrichItinerary(
            itinerary.days,
            activeVenues,
            tripStartDate,
            body.hotel?.lat,
            body.hotel?.lng,
            body.transitPreference
          );

          sendEvent({ type: "progress", percent: 95, phase: "Final touches..." });

          // Save blurbs non-blocking
          saveVenueBlurbs(itinerary, activeVenues).catch(err =>
            console.error("Failed to save venue blurbs:", err)
          );

          // Phase 4: Complete (100%)
          sendEvent({ type: "progress", percent: 100 });
          sendEvent({ type: "result", data: itinerary });
          controller.close();
        } catch (error) {
          console.error("Stream generation error:", error);
          sendEvent({
            type: "error",
            message: error instanceof SyntaxError
              ? "Failed to parse itinerary response from AI."
              : "Failed to generate itinerary. Please try again.",
          });
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
