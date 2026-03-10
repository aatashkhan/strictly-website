import { NextRequest, NextResponse } from "next/server";
import { getCityData } from "@/lib/venues";

/** GET /api/venues/[city] — returns full city data with venues */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  const { city } = await params;
  const cityName = decodeURIComponent(city);
  const data = await getCityData(cityName);

  if (!data) {
    return NextResponse.json(
      { error: `City "${cityName}" not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
