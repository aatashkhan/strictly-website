import type { TripFormData, CityData, Venue } from "@/lib/types";

export function buildSystemPrompt(): string {
  return `You are Denna from "Strictly The Good Stuff" — a lifestyle and travel curator with 25K+ Substack subscribers. You're building a personalized travel itinerary.

YOUR VOICE:
- Warm, knowledgeable friend with great taste — conversational but not over-the-top
- Use her signature vocabulary naturally: "strict/strictest," "good stuff," "grab," "bask," "chic," "honestly," "truly"
- Use "obsessed" sparingly — only for things that genuinely deserve it (once or twice per itinerary, not every item)
- Single exclamation marks are fine. Only use multiple (!! or !!!) very rarely for genuinely standout moments
- Parenthetical insider tips are great: "(line is long but worth it)", "(go early)"
- Be honest and specific — name the dish to order, the exact thing to do, what to skip and why
- Occasional caps for emphasis is fine, but keep it restrained — one or two per day, not every sentence
- Personal anecdotes when relevant, but brief
- Sign off with "xo"
- Tone reference: think of how you'd text a good friend about a place you love — genuine enthusiasm without performing it. More "this place is really special" than "I'm SCREAMING this is THE BEST THING EVER!!!"

CRITICAL RULES:
- ONLY recommend venues from the provided database below. Do not invent places.
- If the database doesn't have enough venues for the trip length, be honest and say "I'm still building out this city — here's what I've got so far."
- Use SPECIFIC TIMES for each item (e.g. "9:00 AM", "12:30 PM", "7:00 PM"), not vague blocks like "Morning" or "Afternoon"
- Include an estimated duration in minutes for each venue visit
- GROUP venues by neighborhood/proximity each day — minimize cross-city travel. Each day should follow a logical geographic arc.
- For each venue: name it EXACTLY as listed in the database, say what to get/do, add a tip
- Keep it feeling personal and warm, not robotic or generic

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no backticks, just raw JSON):
{
  "intro": "A warm, genuine intro about this trip — excited but not breathless",
  "days": [
    {
      "day": 1,
      "title": "Short evocative title for the day",
      "items": [
        {
          "time": "9:00 AM",
          "endTime": "10:30 AM",
          "type": "eat",
          "name": "Exact Venue Name From Database",
          "note": "Your recommendation note in Denna's voice",
          "duration": 90
        }
      ]
    }
  ],
  "signoff": "Your warm closing line with xo"
}`;
}

const TIME_LABELS: Record<string, string> = {
  morning: "in the morning",
  afternoon: "in the afternoon",
  evening: "in the evening",
  "late-night": "late at night",
};

export function buildUserPrompt(
  tripData: TripFormData,
  cityData: CityData
): string {
  const lines: string[] = [];

  lines.push(
    `Plan a ${tripData.duration} trip to ${cityData.city_name}, ${cityData.country}.`
  );
  lines.push("");

  lines.push("TRAVELER INFO:");
  lines.push(`- Companions: ${tripData.companions}`);
  lines.push(`- Vibes they want: ${tripData.vibes.join(", ")}`);
  lines.push(`- Budget: ${tripData.budget}`);

  // Pace / intensity
  const paceInstructions: Record<string, string> = {
    leisurely: "LEISURELY PACE: Plan only 3-4 activities per full day. Leave generous gaps for wandering, relaxing at a cafe, or resting at the hotel. Quality over quantity — fewer stops but let each one breathe. Include downtime blocks like 'free afternoon to explore on your own.'",
    balanced: "BALANCED PACE: Plan 5-6 activities per full day. A solid mix of planned stops and breathing room. Don't overstuff the schedule but keep things moving.",
    packed: "GO GO GO PACE: Pack in 7-8+ activities per full day. This traveler wants to see and do EVERYTHING. Tight transitions, early starts, late nights. Maximize every hour — no downtime blocks unless the traveler specifically asked for rest.",
  };
  const paceKey = tripData.pace || "balanced";
  lines.push(`- ${paceInstructions[paceKey] ?? paceInstructions.balanced}`);
  if (tripData.notes) {
    lines.push(`- Notes: ${tripData.notes}`);
  }
  lines.push("");

  // Arrival info
  if (tripData.arrival && tripData.arrival.type !== "skip") {
    if (tripData.arrival.type === "flight" && tripData.arrival.flightNumber) {
      lines.push(
        `ARRIVAL: Traveler arrives ${tripData.arrival.date ? `on ${tripData.arrival.date} ` : ""}on flight ${tripData.arrival.flightNumber}. Day 1 should only include activities from the estimated arrival time onward — plan for afternoon/evening activities only unless it's an early morning flight.`
      );
    } else if (tripData.arrival.type === "general" && tripData.arrival.time) {
      const timeLabel = TIME_LABELS[tripData.arrival.time] ?? tripData.arrival.time;
      lines.push(
        `ARRIVAL: Traveler arrives ${tripData.arrival.date ? `on ${tripData.arrival.date} ` : ""}${timeLabel}. Day 1 should only include activities from that time onward.`
      );
    }
    lines.push("");
  }

  // Departure info
  if (tripData.departure && tripData.departure.type !== "skip") {
    if (tripData.departure.type === "flight" && tripData.departure.flightNumber) {
      lines.push(
        `DEPARTURE: Traveler departs ${tripData.departure.date ? `on ${tripData.departure.date} ` : ""}on flight ${tripData.departure.flightNumber}. Last day should wrap up by the estimated departure time minus 3 hours (for getting to the airport).`
      );
    } else if (tripData.departure.type === "general" && tripData.departure.time) {
      const timeLabel = TIME_LABELS[tripData.departure.time] ?? tripData.departure.time;
      lines.push(
        `DEPARTURE: Traveler departs ${tripData.departure.date ? `on ${tripData.departure.date} ` : ""}${timeLabel}. Last day should wrap up well before departure — plan only morning activities if departing in the afternoon, or nothing if departing in the morning.`
      );
    }
    lines.push("");
  }

  // Hotel info
  if (tripData.hotel) {
    let hotelLine = `HOTEL: Traveler is staying at ${tripData.hotel.name}`;
    if (tripData.hotel.address) {
      hotelLine += ` (${tripData.hotel.address})`;
    }
    hotelLine += `. Use this as the daily home base — consider proximity when planning each day's activities. Start and end each day near the hotel when possible.`;
    lines.push(hotelLine);
    lines.push("");
  }

  if (cityData.denna_intro) {
    lines.push("DENNA'S CITY INTRO:");
    lines.push(cityData.denna_intro);
    lines.push("");
  }

  // Group venues by neighborhood for geographic context
  const byNeighborhood = new Map<string, Venue[]>();
  for (const venue of cityData.venues) {
    const hood = venue.neighborhood ?? 'Other';
    if (!byNeighborhood.has(hood)) byNeighborhood.set(hood, []);
    byNeighborhood.get(hood)!.push(venue);
  }

  lines.push(`VENUE DATABASE (${cityData.venues.length} venues — ONLY use these):`);
  lines.push("Venues are grouped by neighborhood. Plan each day within 1-2 nearby neighborhoods to minimize travel.");
  lines.push("");

  for (const [neighborhood, venues] of Array.from(byNeighborhood.entries())) {
    lines.push(`  === ${neighborhood} ===`);
    for (const venue of venues) {
      let line = `  - ${venue.name} [${venue.category}/${venue.subcategory}]`;
      if (venue.address) line += ` @ ${venue.address}`;
      if (venue.denna_note) line += `: ${venue.denna_note}`;
      if (venue.opening_hours?.weekday_text?.length) {
        line += ` | Hours: ${venue.opening_hours.weekday_text.join('; ')}`;
      }
      lines.push(line);
    }
    lines.push("");
  }

  lines.push("ROUTING INSTRUCTIONS:");
  lines.push("- Each day should focus on 1-2 nearby neighborhoods. Do NOT zigzag across the city.");
  lines.push("- Plan each day as a smooth geographic arc: start near the hotel, move progressively outward through a neighborhood, then loop back. NEVER send the traveler to Point A, then far away to Point B, then back near Point A for Point C.");
  lines.push("- Think of each day's route like a loop or a line — venues should flow in one general direction, not bounce back and forth.");
  lines.push("- Use specific times (e.g. '9:00 AM', '12:30 PM') for every item, not vague time blocks.");
  lines.push("- Allow realistic time between stops — at least 15-30 min for travel between venues.");
  lines.push("- Check the opening hours above and do NOT schedule a venue when it's closed.");
  lines.push("- Name each venue EXACTLY as listed in the database — do not paraphrase or abbreviate.");

  // Transit preference instructions
  const transitPref = tripData.transitPreference ?? 'auto';
  if (transitPref === 'rideshare') {
    lines.push("- TRANSIT: Traveler prefers Uber/Lyft for all transportation. Do not suggest public transit, subways, or buses. Reference rideshare/car service when mentioning getting between venues.");
  } else if (transitPref === 'public_transit') {
    lines.push("- TRANSIT: Traveler prefers public transit (subway, bus, tram). Mention specific transit lines or stops when relevant. Only suggest walking for very short distances.");
  } else if (transitPref === 'walking_preferred') {
    lines.push("- TRANSIT: Traveler prefers walking whenever possible. Cluster venues extra tightly by neighborhood. Only suggest a car/rideshare for distances that would take more than 25 minutes to walk.");
  } else if (transitPref === 'rental_car') {
    lines.push("- TRANSIT: Traveler has a rental car. Reference driving and mention parking tips when relevant. Don't suggest public transit.");
  }
  lines.push("");

  lines.push(
    "IMPORTANT: Only recommend venues from the database above. Do not invent or suggest any places not listed."
  );

  return lines.join("\n");
}
