/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Verify that the request is from an authenticated admin user.
 * Uses the user's access token to verify identity, then returns a
 * service-role Supabase client for admin data operations (bypasses RLS).
 */
export async function verifyAdmin(request: NextRequest): Promise<
  | { ok: true; supabase: any; userId: string }
  | { ok: false; response: NextResponse }
> {
  // Extract the access token from Authorization header or Supabase auth cookies
  let token: string | null = null;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "");
  }

  if (!token) {
    // Try to get token from Supabase auth cookies
    const cookies = request.cookies;
    for (const cookie of cookies.getAll()) {
      if (cookie.name.includes("auth-token") || cookie.name.includes("access-token") || cookie.name.includes("access_token")) {
        try {
          const parsed = JSON.parse(cookie.value);
          if (Array.isArray(parsed) && parsed[0]) {
            token = parsed[0];
            break;
          }
          if (parsed?.access_token) {
            token = parsed.access_token;
            break;
          }
        } catch {
          if (cookie.value.startsWith("eyJ")) {
            token = cookie.value;
            break;
          }
        }
      }
    }
  }

  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized — no auth token found" }, { status: 401 }) };
  }

  // Verify the user using anon key + their token
  const userClient = createClient<any>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();

  if (userError || !user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized — invalid token" }, { status: 401 }) };
  }

  // Use service role client to check admin status + do data operations (bypasses RLS)
  const serviceClient = createClient<any>(supabaseUrl, supabaseServiceKey);

  const { data: admin } = await serviceClient
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!admin) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden — not an admin" }, { status: 403 }) };
  }

  return { ok: true, supabase: serviceClient, userId: user.id };
}
