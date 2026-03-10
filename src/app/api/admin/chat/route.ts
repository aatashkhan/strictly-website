/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyAdmin } from "@/lib/adminAuth";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "query_venues",
    description: "Search/filter venues in the database. Returns matching venues.",
    input_schema: {
      type: "object" as const,
      properties: {
        city: { type: "string", description: "Filter by city name" },
        category: { type: "string", description: "Filter by category (eat, drink, stay, explore, shop, spa)" },
        neighborhood: { type: "string", description: "Filter by neighborhood" },
        search: { type: "string", description: "Free text search in name or denna_note" },
        needs_review: { type: "boolean", description: "Filter by needs_review status" },
        missing_field: { type: "string", enum: ["denna_note", "neighborhood", "address", "image_url"], description: "Find venues missing this field" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "update_venue",
    description: "Update one or more fields on a single venue.",
    input_schema: {
      type: "object" as const,
      properties: {
        venue_id: { type: "string", description: "UUID of the venue to update" },
        updates: {
          type: "object",
          description: "Fields to update",
          properties: {
            name: { type: "string" },
            category: { type: "string" },
            subcategory: { type: "string" },
            neighborhood: { type: "string" },
            denna_note: { type: "string" },
            price_indicator: { type: "string" },
            status: { type: "string" },
            access: { type: "string" },
            needs_review: { type: "boolean" },
            display_order: { type: "number" },
          },
        },
      },
      required: ["venue_id", "updates"],
    },
  },
  {
    name: "bulk_update_venues",
    description: "Update the same field(s) on multiple venues at once. ALWAYS confirm with the user before executing.",
    input_schema: {
      type: "object" as const,
      properties: {
        venue_ids: { type: "array", items: { type: "string" }, description: "Array of venue UUIDs" },
        updates: { type: "object", description: "Fields to update on all venues" },
      },
      required: ["venue_ids", "updates"],
    },
  },
  {
    name: "add_venue",
    description: "Add a new venue to a city.",
    input_schema: {
      type: "object" as const,
      properties: {
        city_name: { type: "string" },
        name: { type: "string" },
        category: { type: "string" },
        subcategory: { type: "string" },
        neighborhood: { type: "string" },
        denna_note: { type: "string" },
        address: { type: "string" },
      },
      required: ["city_name", "name", "category"],
    },
  },
  {
    name: "delete_venue",
    description: "Delete a venue. ALWAYS confirm with the user first.",
    input_schema: {
      type: "object" as const,
      properties: {
        venue_id: { type: "string" },
      },
      required: ["venue_id"],
    },
  },
];

const SYSTEM_PROMPT = `You are Denna's database assistant for Strictly The Good Stuff. You help her manage the venue database efficiently.

RULES:
- For any BULK update (more than 1 venue), ALWAYS show what you're about to change and ask for confirmation before executing
- For single venue updates, just do it and confirm what you changed
- When Denna asks to see venues, use query_venues and display results in a clean format
- Be concise — Denna is trying to work fast
- If she asks something ambiguous, ask a clarifying question
- You have full read/write access to the venues and cities tables`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = await request.json();
  const { message, history } = body as { message: string; history: ChatMessage[] };

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const messages: Anthropic.MessageParam[] = [];
  for (const msg of (history ?? []).slice(-20)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: "user", content: message });

  // Agentic loop — handle tool calls
  let response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  const toolResults: string[] = [];
  let refreshNeeded = false;

  // Process tool calls in a loop
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ContentBlock & { type: "tool_use" } => b.type === "tool_use"
    );

    const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const input = toolUse.input as Record<string, unknown>;
      let result: string;

      try {
        switch (toolUse.name) {
          case "query_venues": {
            let query = supabase.from("venues").select("id, name, category, subcategory, neighborhood, denna_note, status, needs_review, access, address, price_indicator, cities!inner(city_name)");
            if (input.city) query = query.eq("cities.city_name", input.city as string);
            if (input.category) query = query.eq("category", input.category as string);
            if (input.neighborhood) query = query.ilike("neighborhood", `%${input.neighborhood}%`);
            if (input.search) query = query.or(`name.ilike.%${input.search}%,denna_note.ilike.%${input.search}%`);
            if (input.needs_review === true) query = query.eq("needs_review", true);
            if (input.missing_field) query = query.is(input.missing_field as string, null);
            query = query.limit((input.limit as number) || 20);

            const { data, error } = await query;
            if (error) {
              result = `Error: ${error.message}`;
            } else {
              result = JSON.stringify(data, null, 2);
            }
            break;
          }

          case "update_venue": {
            const { data, error } = await supabase
              .from("venues")
              .update(input.updates as Record<string, unknown>)
              .eq("id", input.venue_id as string)
              .select("id, name")
              .single();
            if (error) {
              result = `Error: ${error.message}`;
            } else {
              result = `Updated venue: ${data.name} (${data.id})`;
              refreshNeeded = true;
            }
            break;
          }

          case "bulk_update_venues": {
            const ids = input.venue_ids as string[];
            const { data, error } = await supabase
              .from("venues")
              .update(input.updates as Record<string, unknown>)
              .in("id", ids)
              .select("id, name");
            if (error) {
              result = `Error: ${error.message}`;
            } else {
              result = `Updated ${data?.length ?? 0} venues`;
              refreshNeeded = true;
            }
            break;
          }

          case "add_venue": {
            const cityName = input.city_name as string;
            const { data: city } = await supabase
              .from("cities")
              .select("id")
              .eq("city_name", cityName)
              .single();
            if (!city) {
              result = `Error: City "${cityName}" not found`;
              break;
            }
            const venueData = { ...input, city_id: city.id };
            delete (venueData as Record<string, unknown>).city_name;
            const { data, error } = await supabase
              .from("venues")
              .insert(venueData)
              .select("id, name")
              .single();
            if (error) {
              result = `Error: ${error.message}`;
            } else {
              result = `Created venue: ${data.name} (${data.id})`;
              refreshNeeded = true;
            }
            break;
          }

          case "delete_venue": {
            const { data: venue } = await supabase
              .from("venues")
              .select("name")
              .eq("id", input.venue_id as string)
              .single();
            const { error } = await supabase
              .from("venues")
              .delete()
              .eq("id", input.venue_id as string);
            if (error) {
              result = `Error: ${error.message}`;
            } else {
              result = `Deleted venue: ${venue?.name ?? input.venue_id}`;
              refreshNeeded = true;
            }
            break;
          }

          default:
            result = `Unknown tool: ${toolUse.name}`;
        }
      } catch (e) {
        result = `Tool error: ${e instanceof Error ? e.message : "Unknown error"}`;
      }

      toolResults.push(`[${toolUse.name}]: ${result}`);
      toolResultContents.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    // Continue the conversation with tool results
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResultContents });

    response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
  }

  // Extract final text response
  const textContent = response.content.find((b) => b.type === "text");
  const text = textContent && "text" in textContent ? textContent.text : "";

  return NextResponse.json({
    message: text,
    toolResults,
    refreshNeeded,
  });
}
