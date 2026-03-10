/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";

/** GET /api/admin/content — list all site_content rows grouped by section */
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("site_content")
    .select("*")
    .order("section")
    .order("display_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by section
  const sections: Record<string, any[]> = {};
  for (const row of data ?? []) {
    if (!sections[row.section]) sections[row.section] = [];
    sections[row.section].push(row);
  }

  return NextResponse.json({ sections, items: data });
}

/** PUT /api/admin/content — update a single site_content row */
export async function PUT(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase, userId } = auth;

  const { id, value } = await request.json();

  if (!id || value === undefined) {
    return NextResponse.json({ error: "id and value required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("site_content")
    .update({ value, updated_by: userId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
