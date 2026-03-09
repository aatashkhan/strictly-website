import { NextResponse } from "next/server";

// Auth is handled client-side on /trips pages (useUser hook).
// No server-side middleware needed since Supabase stores tokens in localStorage.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
