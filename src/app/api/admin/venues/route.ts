/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";

/** GET /api/admin/venues — list/filter venues */
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const url = new URL(request.url);
  const city = url.searchParams.get("city");
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");
  const needsReview = url.searchParams.get("needs_review");
  const missingField = url.searchParams.get("missing_field");
  const search = url.searchParams.get("search");
  const sort = url.searchParams.get("sort") || "needs_review_first";
  const limit = parseInt(url.searchParams.get("limit") || "100", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("venues")
    .select("*, cities!inner(city_name, country)", { count: "exact" });

  if (city) {
    query = query.eq("cities.city_name", city);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (status === "needs_review") {
    query = query.eq("needs_review", true);
  } else if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (needsReview === "true") {
    query = query.eq("needs_review", true);
  }
  if (missingField) {
    query = query.is(missingField, null);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,denna_note.ilike.%${search}%,neighborhood.ilike.%${search}%`);
  }

  // Sorting
  switch (sort) {
    case "name":
      query = query.order("name");
      break;
    case "category":
      query = query.order("category").order("name");
      break;
    case "neighborhood":
      query = query.order("neighborhood", { nullsFirst: false }).order("name");
      break;
    case "display_order":
      query = query.order("display_order", { nullsFirst: false }).order("name");
      break;
    case "updated":
      query = query.order("updated_at", { ascending: false });
      break;
    case "needs_review_first":
    default:
      query = query.order("needs_review", { ascending: false }).order("name");
      break;
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ venues: data, total: count });
}

/** POST /api/admin/venues — create a new venue */
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = await request.json();
  const { city_name, ...venueData } = body;

  if (!city_name || !venueData.name || !venueData.category) {
    return NextResponse.json(
      { error: "city_name, name, and category are required" },
      { status: 400 }
    );
  }

  // Look up city ID
  const { data: city } = await supabase
    .from("cities")
    .select("id")
    .eq("city_name", city_name)
    .single();

  if (!city) {
    return NextResponse.json({ error: `City "${city_name}" not found` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("venues")
    .insert({ ...venueData, city_id: city.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ venue: data }, { status: 201 });
}
