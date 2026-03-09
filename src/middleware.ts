import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  // Only protect /trips routes (not shared trip links)
  if (request.nextUrl.pathname.startsWith("/trips") && !request.nextUrl.pathname.includes("/shared")) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.next();
    }

    // Check for auth token in cookies
    const accessToken =
      request.cookies.get("sb-access-token")?.value ||
      request.cookies.get(`sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`)?.value;

    if (!accessToken) {
      // Redirect to concierge with auth prompt
      const url = request.nextUrl.clone();
      url.pathname = "/concierge";
      url.searchParams.set("auth", "required");
      return NextResponse.redirect(url);
    }

    // Verify the token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/concierge";
      url.searchParams.set("auth", "required");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/trips/:path*"],
};
