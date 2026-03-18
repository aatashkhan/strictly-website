import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/** GET /api/admin/venues/lookup?q=venue+name&city=Paris
 *  Searches Google Places for a venue, returns candidates with full details.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;

  const q = request.nextUrl.searchParams.get("q");
  const city = request.nextUrl.searchParams.get("city");

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Search with city context for better results
    const searchQuery = city ? `${q} ${city}` : q;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { error: `Places search failed: ${data.status}` },
        { status: 502 }
      );
    }

    const candidates = (data.results || []).slice(0, 5).map(
      (r: {
        name: string;
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
        place_id: string;
        opening_hours?: { open_now?: boolean };
        types?: string[];
      }) => ({
        name: r.name,
        address: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        place_id: r.place_id,
        types: r.types ?? [],
        google_maps_url: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
      })
    );

    return NextResponse.json({ results: candidates });
  } catch (error) {
    console.error("Venue lookup error:", error);
    return NextResponse.json(
      { error: "Failed to search for venue" },
      { status: 500 }
    );
  }
}

/** POST /api/admin/venues/lookup — fetch Place Details for a specific place_id */
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return auth.response;

  const { place_id } = await request.json();
  if (!place_id) {
    return NextResponse.json({ error: "place_id required" }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=name,formatted_address,geometry,opening_hours,website,url&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") {
      return NextResponse.json(
        { error: `Place Details failed: ${data.status}` },
        { status: 502 }
      );
    }

    const r = data.result;
    return NextResponse.json({
      details: {
        name: r.name,
        address: r.formatted_address,
        lat: r.geometry?.location?.lat,
        lng: r.geometry?.location?.lng,
        opening_hours: r.opening_hours
          ? {
              periods: r.opening_hours.periods ?? [],
              weekday_text: r.opening_hours.weekday_text ?? [],
            }
          : null,
        website: r.website ?? null,
        google_maps_url: r.url ?? null,
      },
    });
  } catch (error) {
    console.error("Place Details error:", error);
    return NextResponse.json(
      { error: "Failed to get place details" },
      { status: 500 }
    );
  }
}
