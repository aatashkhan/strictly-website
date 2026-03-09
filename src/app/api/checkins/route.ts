import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase(token);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { trip_id, venue_id, day_index, item_index, note } = body;

  if (!trip_id || day_index === undefined || item_index === undefined) {
    return NextResponse.json(
      { error: "trip_id, day_index, and item_index are required" },
      { status: 400 }
    );
  }

  // Prevent duplicate check-ins for the same item
  const { data: existing } = await supabase
    .from("checkins")
    .select("id")
    .eq("trip_id", trip_id)
    .eq("day_index", day_index)
    .eq("item_index", item_index)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(existing);
  }

  const { data, error } = await supabase
    .from("checkins")
    .insert({
      trip_id,
      venue_id: venue_id || null,
      day_index,
      item_index,
      note: note || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase(token);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get("trip_id");
  const dayIndex = searchParams.get("day_index");

  let query = supabase.from("checkins").select("*");

  if (tripId) query = query.eq("trip_id", tripId);
  if (dayIndex !== null && dayIndex !== undefined) query = query.eq("day_index", parseInt(dayIndex));

  const { data, error } = await query.order("checked_in_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
