/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";

/** GET /api/admin/cities/[id] */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  return NextResponse.json({ city: data });
}

/** PUT /api/admin/cities/[id] */
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
    .from("cities")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ city: data });
}

/** DELETE /api/admin/cities/[id] — delete city and all its venues */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  // Delete all venues in the city first
  const { error: venueError } = await supabase
    .from("venues")
    .delete()
    .eq("city_id", id);

  if (venueError) {
    return NextResponse.json({ error: venueError.message }, { status: 500 });
  }

  // Delete the city
  const { error } = await supabase.from("cities").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
