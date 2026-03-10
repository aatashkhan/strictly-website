import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/siteContent";

/** GET /api/theme — public endpoint returning theme colors/fonts */
export async function GET() {
  const theme = await getSiteContent("theme");
  return NextResponse.json(theme);
}
