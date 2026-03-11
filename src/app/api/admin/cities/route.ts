/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";

/** GET /api/admin/cities — list all cities with venue counts */
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { data: cities, error } = await supabase
    .from("cities")
    .select("*")
    .order("city_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get venue counts — paginate because Supabase caps at 1000 rows per request
  const allVenues: any[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("venues")
      .select("city_id, needs_review")
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allVenues.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const cityStats = new Map<string, { total: number; needsReview: number }>();
  for (const v of allVenues) {
    if (!cityStats.has(v.city_id)) {
      cityStats.set(v.city_id, { total: 0, needsReview: 0 });
    }
    const s = cityStats.get(v.city_id)!;
    s.total++;
    if (v.needs_review) s.needsReview++;
  }

  const enriched = (cities ?? []).map((c: any) => {
    const stats = cityStats.get(c.id);
    return {
      ...c,
      venue_count: stats?.total ?? 0,
      needs_review_count: stats?.needsReview ?? 0,
    };
  });

  return NextResponse.json({ cities: enriched });
}

/** POST /api/admin/cities — create a new city */
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = await request.json();
  const { city_name, country, region } = body;

  if (!city_name || !country) {
    return NextResponse.json(
      { error: "city_name and country are required" },
      { status: 400 }
    );
  }

  const slug = city_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const { data, error } = await supabase
    .from("cities")
    .insert({ slug, city_name, country, region: region || null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ city: data }, { status: 201 });
}
