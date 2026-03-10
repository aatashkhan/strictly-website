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

  // Get venue counts and needs_review counts per city
  // Supabase default limit is 1000; we have 1500+ venues
  const { data: venueCounts } = await supabase
    .from("venues")
    .select("city_id, needs_review")
    .range(0, 4999);

  const cityStats = new Map<string, { total: number; needsReview: number }>();
  for (const v of venueCounts ?? []) {
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
