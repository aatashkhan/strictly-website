import { NextResponse } from "next/server";
import { getCities, getCityMetas } from "@/lib/venues";

/** GET /api/venues — returns city list or city metas */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detail = searchParams.get("detail");

  if (detail === "meta") {
    const metas = await getCityMetas();
    return NextResponse.json(metas);
  }

  const cities = await getCities();
  return NextResponse.json(cities);
}
