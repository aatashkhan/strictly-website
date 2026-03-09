import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_DISTANCE_KM = 80; // ~50 miles

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
    const lat = request.nextUrl.searchParams.get("lat");
    const lng = request.nextUrl.searchParams.get("lng");
    const centerLat = lat ? parseFloat(lat) : null;
    const centerLng = lng ? parseFloat(lng) : null;

    // Use Google Places Text Search API with location bias
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&type=lodging&key=${API_KEY}`;
    if (centerLat != null && centerLng != null) {
      url += `&location=${centerLat},${centerLng}&radius=50000`; // 50km bias
    }
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places API error:", data.status, data.error_message);
      return NextResponse.json([]);
    }

    const allResults = (data.results || []).map(
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

    // Hard-filter: reject any result more than 80km (~50 miles) from city center
    let results = allResults;
    if (centerLat != null && centerLng != null) {
      results = allResults.filter(
        (r: { lat: number; lng: number }) =>
          haversineKm(centerLat, centerLng, r.lat, r.lng) <= MAX_DISTANCE_KM
      );

      if (results.length === 0 && allResults.length > 0) {
        console.warn(
          `Places API: all ${allResults.length} results were outside ${MAX_DISTANCE_KM}km radius for query "${q}". Closest was ${Math.round(
            haversineKm(centerLat, centerLng, allResults[0].lat, allResults[0].lng)
          )}km away.`
        );
      }
    }

    return NextResponse.json(results.slice(0, 5));
  } catch (error) {
    console.error("Places API fetch error:", error);
    return NextResponse.json([]);
  }
}
