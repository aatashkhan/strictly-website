import type { Venue, VenueOpeningHours, ItineraryItem, TravelSegment, ItineraryWarning, TransitMode } from './types';

/**
 * Haversine distance between two lat/lng points in kilometers.
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Estimate travel time and mode between two points.
 * Walking: ~5 km/h → if distance < 1.5 km, suggest walking
 * Transit/driving: ~25 km/h average in a city
 * transitPreference overrides automatic mode selection.
 */
export function estimateTravel(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  transitPreference?: TransitMode
): TravelSegment {
  const km = haversineKm(lat1, lng1, lat2, lng2);
  // Haversine is straight-line; real walking/driving is ~1.3-1.5x longer
  const realKm = km * 1.4;

  // Determine mode based on preference
  const mode = resolveTransitMode(realKm, transitPreference);

  if (mode === 'walking') {
    const minutes = Math.round((realKm / 5) * 60);
    return {
      distance: `${realKm.toFixed(1)} km`,
      duration: Math.max(minutes, 2),
      mode: 'walking',
      summary: `${Math.max(minutes, 2)} min walk`,
    };
  }

  if (mode === 'driving') {
    const minutes = Math.round((realKm / 30) * 60); // rideshare/car ~30km/h in city
    return {
      distance: `${realKm.toFixed(1)} km`,
      duration: Math.max(minutes, 4),
      mode: 'driving',
      summary: `${Math.max(minutes, 4)} min drive`,
    };
  }

  // transit
  const minutes = Math.round((realKm / 25) * 60);
  return {
    distance: `${realKm.toFixed(1)} km`,
    duration: Math.max(minutes, 5),
    mode: 'transit',
    summary: `${Math.max(minutes, 5)} min transit`,
  };
}

/**
 * Resolve the transit mode for a segment based on distance and user preference.
 */
function resolveTransitMode(realKm: number, preference?: TransitMode): string {
  if (!preference || preference === 'auto') {
    // Auto: walk < 1.5km, transit 1.5-10km, drive > 10km
    if (realKm < 1.5) return 'walking';
    if (realKm > 10) return 'driving';
    return 'transit';
  }
  if (preference === 'walking_preferred') {
    // Walk if < 2.5km (~30 min), otherwise rideshare
    return realKm < 2.5 ? 'walking' : 'driving';
  }
  if (preference === 'rideshare') return 'driving';
  if (preference === 'public_transit') return realKm < 1.0 ? 'walking' : 'transit';
  if (preference === 'rental_car') return realKm < 0.8 ? 'walking' : 'driving';
  return realKm < 1.5 ? 'walking' : 'transit';
}

/**
 * Optimize the geographic order of items within a day to minimize zig-zagging.
 * Uses nearest-neighbor heuristic starting from an anchor point (hotel or first venue).
 * Preserves arrival/departure items and non-venue items in their original positions.
 */
export function optimizeRouteOrder(
  items: ItineraryItem[],
  venues: Venue[],
  anchorLat?: number,
  anchorLng?: number
): ItineraryItem[] {
  if (items.length <= 2) return items;

  // Separate items into venue items (reorderable) and fixed items (arrival/departure/free time)
  const fixedTypes = new Set(['arrival', 'departure', 'flight', 'travel', 'check-in', 'check-out']);
  const indexed: Array<{ item: ItineraryItem; idx: number; lat?: number; lng?: number; fixed: boolean }> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isFixed = fixedTypes.has(item.type?.toLowerCase?.() ?? '') ||
      item.name?.toLowerCase?.().includes('free time') ||
      item.name?.toLowerCase?.().includes('hotel') ||
      item.name?.toLowerCase?.().includes('airport');

    let lat: number | undefined;
    let lng: number | undefined;

    if (item.lat != null && item.lng != null) {
      lat = item.lat;
      lng = item.lng;
    } else {
      const matched = matchVenue(item.name, venues);
      if (matched?.lat && matched?.lng) {
        lat = matched.lat;
        lng = matched.lng;
      }
    }

    indexed.push({ item, idx: i, lat, lng, fixed: isFixed });
  }

  // Get reorderable items that have coordinates
  const reorderable = indexed.filter(e => !e.fixed && e.lat != null && e.lng != null);
  const fixedItems = indexed.filter(e => e.fixed || (e.lat == null || e.lng == null));

  if (reorderable.length <= 2) return items;

  // Nearest-neighbor ordering starting from anchor (hotel) or first item
  const startLat = anchorLat ?? reorderable[0].lat!;
  const startLng = anchorLng ?? reorderable[0].lng!;

  const ordered: typeof reorderable = [];
  const remaining = [...reorderable];
  let curLat = startLat;
  let curLng = startLng;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(curLat, curLng, remaining[i].lat!, remaining[i].lng!);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    ordered.push(chosen);
    curLat = chosen.lat!;
    curLng = chosen.lng!;
  }

  // Rebuild the items array: fixed items stay in position, reorderable fill the gaps
  const result: ItineraryItem[] = [];

  // Put leading fixed items first (arrival, check-in, etc)
  const leadingFixed: typeof fixedItems = [];
  const trailingFixed: typeof fixedItems = [];
  const middleFixed: typeof fixedItems = [];

  for (const f of fixedItems) {
    if (f.idx === 0 || (f.idx < (reorderable[0]?.idx ?? Infinity))) {
      leadingFixed.push(f);
    } else if (f.idx >= (indexed.length - 1)) {
      trailingFixed.push(f);
    } else {
      middleFixed.push(f);
    }
  }

  // Leading fixed items
  for (const f of leadingFixed.sort((a, b) => a.idx - b.idx)) {
    result.push(f.item);
  }

  // Interleave reordered items
  for (const o of ordered) {
    result.push(o.item);
  }

  // Middle fixed items (like free time blocks) go after reorderable
  for (const f of middleFixed.sort((a, b) => a.idx - b.idx)) {
    result.push(f.item);
  }

  // Trailing fixed items
  for (const f of trailingFixed.sort((a, b) => a.idx - b.idx)) {
    result.push(f.item);
  }

  // Reassign times based on original time ordering (preserve the time slots, just reorder venues into them)
  const originalTimes = items.map(i => ({ time: i.time, endTime: i.endTime, duration: i.duration }));
  for (let i = 0; i < result.length && i < originalTimes.length; i++) {
    result[i] = { ...result[i], time: originalTimes[i].time, endTime: originalTimes[i].endTime, duration: originalTimes[i].duration };
  }

  return result;
}

/**
 * Match an itinerary venue name to the closest DB venue (fuzzy).
 * Returns the best match or null.
 */
export function matchVenue(name: string, venues: Venue[]): Venue | null {
  const normalized = name.toLowerCase().trim();

  // Exact match first
  const exact = venues.find(v => v.name.toLowerCase().trim() === normalized);
  if (exact) return exact;

  // Contains match (venue name contains the search or vice versa)
  const contains = venues.find(
    v =>
      v.name.toLowerCase().includes(normalized) ||
      normalized.includes(v.name.toLowerCase())
  );
  if (contains) return contains;

  // Word-overlap scoring
  const searchWords = new Set(normalized.split(/\s+/));
  let bestScore = 0;
  let bestVenue: Venue | null = null;

  for (const v of venues) {
    const venueWords = v.name.toLowerCase().split(/\s+/);
    let overlap = 0;
    for (const w of venueWords) {
      if (searchWords.has(w)) overlap++;
    }
    const score = overlap / Math.max(searchWords.size, venueWords.length);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestVenue = v;
    }
  }

  return bestVenue;
}

/**
 * Parse a time string like "9:00 AM" into hours (0-23) and minutes.
 */
export function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  // Handle "Morning", "Afternoon", etc. legacy format
  const periodMap: Record<string, number> = {
    morning: 9,
    lunch: 12,
    afternoon: 14,
    evening: 19,
    night: 21,
  };
  const lower = timeStr.toLowerCase().trim();
  if (periodMap[lower] !== undefined) {
    return { hours: periodMap[lower], minutes: 0 };
  }

  // Parse "9:00 AM", "2:30 PM", etc.
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return { hours, minutes };
}

/**
 * Check if a venue is open at a given day of week + time.
 * dayOfWeek: 0 = Sunday, 1 = Monday, ... 6 = Saturday (matches Google's format)
 */
export function isVenueOpen(
  hours: VenueOpeningHours,
  dayOfWeek: number,
  timeHours: number,
  timeMinutes: number
): boolean {
  if (!hours.periods || hours.periods.length === 0) return true; // assume open if no data

  // Google format: time is "HHMM" string like "0900", "1730"
  const checkTime = String(timeHours).padStart(2, '0') + String(timeMinutes).padStart(2, '0');

  for (const period of hours.periods) {
    if (period.open.day === dayOfWeek) {
      const opensAt = period.open.time;
      const closesAt = period.close?.time ?? '2359';

      // Handle overnight periods (closes next day)
      if (period.close && period.close.day !== period.open.day) {
        // Open from opensAt until midnight
        if (checkTime >= opensAt) return true;
      } else {
        if (checkTime >= opensAt && checkTime < closesAt) return true;
      }
    }

    // Check if we're in the "after midnight" part of an overnight period
    if (period.close && period.close.day === dayOfWeek && period.close.day !== period.open.day) {
      if (checkTime < period.close.time) return true;
    }
  }

  return false;
}

/**
 * Validate opening hours for an itinerary item against a venue.
 * Returns warnings if the venue appears to be closed.
 * tripStartDate is the first day of the trip (to calculate day of week).
 */
export function validateOpeningHours(
  item: ItineraryItem,
  venue: Venue,
  dayIndex: number,
  tripStartDate?: string
): ItineraryWarning[] {
  const warnings: ItineraryWarning[] = [];

  if (!venue.opening_hours) {
    // No hours data — don't warn, it's not actionable
    return warnings;
  }

  const parsed = parseTime(item.time);
  if (!parsed) return warnings;

  // Calculate day of week
  let dayOfWeek: number;
  if (tripStartDate) {
    const start = new Date(tripStartDate + 'T00:00:00');
    start.setDate(start.getDate() + dayIndex);
    dayOfWeek = start.getDay();
  } else {
    // Default to Monday + offset (reasonable assumption)
    dayOfWeek = (1 + dayIndex) % 7;
  }

  if (!isVenueOpen(venue.opening_hours, dayOfWeek, parsed.hours, parsed.minutes)) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    const hoursText = venue.opening_hours.weekday_text?.find(t =>
      t.toLowerCase().startsWith(dayName.toLowerCase())
    );
    warnings.push({
      type: 'closed',
      message: hoursText
        ? `${venue.name} may be closed at this time (${hoursText})`
        : `${venue.name} may be closed on ${dayName} at ${item.time}`,
    });
  }

  return warnings;
}

/**
 * Find an open replacement venue of the same category near the original venue.
 * Returns null if no suitable replacement is found.
 */
function findOpenReplacement(
  closedVenue: Venue,
  allVenues: Venue[],
  usedVenueIds: Set<string>,
  dayOfWeek: number,
  timeHours: number,
  timeMinutes: number
): Venue | null {
  const candidates = allVenues.filter((v) => {
    if (v.id === closedVenue.id) return false;
    if (usedVenueIds.has(v.id)) return false;
    if (v.category !== closedVenue.category) return false;
    if (!v.lat || !v.lng) return false;

    // Must be open at this time (or have no hours data — assume open)
    if (v.opening_hours) {
      if (!isVenueOpen(v.opening_hours, dayOfWeek, timeHours, timeMinutes)) return false;
    }

    return true;
  });

  if (candidates.length === 0) return null;

  // Sort by proximity to original venue (prefer same neighborhood, then distance)
  if (closedVenue.lat && closedVenue.lng) {
    candidates.sort((a, b) => {
      // Same neighborhood gets a big boost
      const aNeighborhood = a.neighborhood === closedVenue.neighborhood ? 0 : 10;
      const bNeighborhood = b.neighborhood === closedVenue.neighborhood ? 0 : 10;
      const aDist = haversineKm(closedVenue.lat!, closedVenue.lng!, a.lat!, a.lng!) + aNeighborhood;
      const bDist = haversineKm(closedVenue.lat!, closedVenue.lng!, b.lat!, b.lng!) + bNeighborhood;
      return aDist - bDist;
    });
  }

  return candidates[0];
}

/**
 * Enrich itinerary items with venue data, travel segments, and warnings.
 * Automatically replaces venues that are closed on the scheduled day/time.
 * Optimizes route order to minimize zig-zagging within each day.
 */
export function enrichItinerary(
  days: Array<{ day: number; title: string; items: ItineraryItem[] }>,
  venues: Venue[],
  tripStartDate?: string,
  hotelLat?: number,
  hotelLng?: number,
  transitPreference?: TransitMode
): Array<{ day: number; title: string; items: ItineraryItem[] }> {
  // Track all venue IDs used across the entire itinerary to avoid duplicates
  const usedVenueIds = new Set<string>();

  // First pass: collect all initially matched venue IDs
  for (const day of days) {
    for (const item of day.items) {
      const venue = matchVenue(item.name, venues);
      if (venue) usedVenueIds.add(venue.id);
    }
  }

  return days.map((day, dayIndex) => {
    // Optimize geographic order within the day to minimize zig-zagging
    const optimizedItems = optimizeRouteOrder(day.items, venues, hotelLat, hotelLng);

    const enrichedItems = optimizedItems.map((item, itemIndex) => {
      const enriched = { ...item };

      // Match venue from DB
      let venue = matchVenue(item.name, venues);
      if (venue) {
        // Check if venue is closed at this time
        const parsed = parseTime(item.time);
        if (parsed && venue.opening_hours) {
          let dayOfWeek: number;
          if (tripStartDate) {
            const start = new Date(tripStartDate + 'T00:00:00');
            start.setDate(start.getDate() + dayIndex);
            dayOfWeek = start.getDay();
          } else {
            dayOfWeek = (1 + dayIndex) % 7;
          }

          if (!isVenueOpen(venue.opening_hours, dayOfWeek, parsed.hours, parsed.minutes)) {
            // Try to find an open replacement
            const replacement = findOpenReplacement(
              venue, venues, usedVenueIds, dayOfWeek, parsed.hours, parsed.minutes
            );

            if (replacement) {
              usedVenueIds.delete(venue.id);
              usedVenueIds.add(replacement.id);
              venue = replacement;
              enriched.name = replacement.name;
              enriched.note = replacement.denna_note
                ? replacement.denna_note
                : enriched.note;
              enriched.type = replacement.category;
              // Auto-swap is silent — user doesn't need to know about venue scheduling internals
            } else {
              // No replacement found — keep original, don't surface scheduling details to user
            }
          }
        }

        enriched.venueId = venue.id;
        enriched.address = venue.address ?? undefined;
        enriched.lat = venue.lat ?? undefined;
        enriched.lng = venue.lng ?? undefined;
      } else {
        // Don't warn for free time / downtime blocks — they're intentional non-venue items
        // Only suppress; no warning shown to the user
      }

      // Calculate travel to next item
      const nextItem = optimizedItems[itemIndex + 1];
      if (nextItem) {
        const nextVenue = matchVenue(nextItem.name, venues);
        if (
          enriched.lat != null && enriched.lng != null &&
          nextVenue?.lat != null && nextVenue?.lng != null
        ) {
          enriched.travelToNext = estimateTravel(
            enriched.lat, enriched.lng,
            nextVenue.lat, nextVenue.lng,
            transitPreference
          );
        } else {
          enriched.travelToNext = null;
        }
      } else {
        enriched.travelToNext = null;
      }

      return enriched;
    });

    return { ...day, items: enrichedItems };
  });
}
