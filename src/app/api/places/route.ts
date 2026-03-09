import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 3) {
    return NextResponse.json([]);
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Use Google Places Text Search API with location bias
    const lat = request.nextUrl.searchParams.get("lat");
    const lng = request.nextUrl.searchParams.get("lng");
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&type=lodging&key=${API_KEY}`;
    if (lat && lng) {
      url += `&location=${lat},${lng}&radius=50000`; // 50km bias
    }
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places API error:", data.status, data.error_message);
      return NextResponse.json([]);
    }

    const results = (data.results || []).slice(0, 5).map(
      (r: {
        name: string;
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
        place_id: string;
      }) => ({
        name: r.name,
        address: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        placeId: r.place_id,
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Places API fetch error:", error);
    return NextResponse.json([]);
  }
}
