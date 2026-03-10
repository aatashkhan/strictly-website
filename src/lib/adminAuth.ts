/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Verify that the request is from an authenticated admin user.
 * Returns the Supabase client (authed) and user ID, or a 401/403 response.
 */
export async function verifyAdmin(request: NextRequest): Promise<
  | { ok: true; supabase: any; userId: string }
  | { ok: false; response: NextResponse }
> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
      global: { headers: { cookie: cookieHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const { data: admin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!admin) {
      return { ok: false, response: NextResponse.json({ error: "Forbidden — not an admin" }, { status: 403 }) };
    }

    return { ok: true, supabase, userId: user.id };
  }

  const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!admin) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden — not an admin" }, { status: 403 }) };
  }

  return { ok: true, supabase, userId: user.id };
}
