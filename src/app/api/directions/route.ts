import { NextRequest, NextResponse } from "next/server";

interface Waypoint {
  lat: number;
  lng: number;
}

interface DirectionsLeg {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
}

// Simple in-memory cache for direction results (survives for server lifetime)
const cache = new Map<string, { legs: DirectionsLeg[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

function cacheKey(waypoints: Waypoint[]): string {
  return waypoints.map(w => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`).join('|');
}

export async function POST(request: NextRequest) {
  try {
    const { waypoints } = (await request.json()) as { waypoints: Waypoint[] };

    if (!waypoints || waypoints.length < 2) {
      return NextResponse.json(
        { error: "At least 2 waypoints required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 500 }
      );
    }

    // Check cache
    const key = cacheKey(waypoints);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ legs: cached.legs, cached: true });
    }

    // Build Google Directions API request
    const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;

    const intermediates = waypoints.slice(1, -1);
    const waypointsParam = intermediates.length > 0
      ? `&waypoints=${intermediates.map(w => `${w.lat},${w.lng}`).join('|')}`
      : '';

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsParam}&mode=walking&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      // Fallback: return empty legs rather than error
      console.warn('Google Directions API returned:', data.status);
      return NextResponse.json({ legs: [], status: data.status });
    }

    const legs: DirectionsLeg[] = data.routes[0].legs.map(
      (leg: { distance: { text: string; value: number }; duration: { text: string; value: number } }) => ({
        distance: leg.distance,
        duration: leg.duration,
      })
    );

    // Cache the result
    cache.set(key, { legs, timestamp: Date.now() });

    return NextResponse.json({ legs, cached: false });
  } catch (error) {
    console.error("Directions API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch directions" },
      { status: 500 }
    );
  }
}
