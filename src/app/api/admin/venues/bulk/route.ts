/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";

/** PUT /api/admin/venues/bulk — bulk update venues */
export async function PUT(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { venue_ids, updates } = await request.json();

  if (!Array.isArray(venue_ids) || venue_ids.length === 0 || !updates) {
    return NextResponse.json(
      { error: "venue_ids (array) and updates (object) are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("venues")
    .update(updates)
    .in("id", venue_ids)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length ?? 0, venues: data });
}
