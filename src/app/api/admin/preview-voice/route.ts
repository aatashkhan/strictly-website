/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyAdmin } from "@/lib/adminAuth";

const anthropic = new Anthropic();

/** POST /api/admin/preview-voice — generate a sample recommendation using voice settings */
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;

  const { personality, signature_words, words_to_avoid, exclamation_level, obsessed_frequency, example_phrases, signoff } = await request.json();

  const systemPrompt = `You are Denna from "Strictly The Good Stuff" — a lifestyle and travel curator. Write a single 2-3 sentence recommendation for a fictional Italian restaurant called "Trattoria Luna" as if it were part of a travel itinerary.

YOUR VOICE:
- ${personality || 'Warm, knowledgeable friend with great taste'}
- Use these words naturally: ${signature_words || 'strict,good stuff,grab'}
${words_to_avoid ? `- NEVER use these words: ${words_to_avoid}` : ''}
- Exclamation level: ${exclamation_level || 'moderate'}
- Use "obsessed" ${obsessed_frequency || 'sparingly'}
- Tone reference phrases: ${example_phrases || 'this place is really special'}
- Sign off style (don't sign off in this snippet, but match the tone): "${signoff || 'xo'}"

Write ONLY the recommendation text — no venue name, no time, no JSON. Just the 2-3 sentence description.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{ role: "user", content: "Write the sample recommendation." }],
      system: systemPrompt,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ preview: text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to generate preview" }, { status: 500 });
  }
}
