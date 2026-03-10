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
