/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";

/** GET /api/admin/venues/[id] — single venue */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const { data, error } = await supabase
    .from("venues")
    .select("*, cities(city_name, country)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  return NextResponse.json({ venue: data });
}

/** PUT /api/admin/venues/[id] — update venue */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const updates = await request.json();

  const { data, error } = await supabase
    .from("venues")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ venue: data });
}

/** DELETE /api/admin/venues/[id] — delete venue */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const { error } = await supabase.from("venues").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
