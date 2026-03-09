"use client";

import { useState, useEffect, useMemo } from "react";
import VenueCard from "./VenueCard";
import type { ItineraryDay, Venue } from "@/lib/types";

interface CheckIn {
  id: string;
  venue_id: string;
  day_index: number;
  item_index: number;
}

interface TodayTimelineProps {
  day: ItineraryDay;
  dayIndex: number;
  venues: Venue[];
  checkins: CheckIn[];
  onCheckIn: (itemIndex: number, venueId?: string) => void;
}

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export default function TodayTimeline({
  day,
  dayIndex,
  venues,
  checkins,
  onCheckIn,
}: TodayTimelineProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const venueById = useMemo(() => {
    const map = new Map<string, Venue>();
    for (const v of venues) map.set(v.id, v);
    return map;
  }, [venues]);

  const checkedInItems = useMemo(() => {
    const set = new Set<number>();
    for (const c of checkins) {
      if (c.day_index === dayIndex) set.add(c.item_index);
    }
    return set;
  }, [checkins, dayIndex]);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const totalItems = day.items.length;
  const checkedInCount = checkedInItems.size;

  // Find current item index
  const currentItemIndex = useMemo(() => {
    for (let i = day.items.length - 1; i >= 0; i--) {
      const itemMinutes = parseTimeToMinutes(day.items[i].time);
      if (currentMinutes >= itemMinutes) return i;
    }
    return 0;
  }, [day.items, currentMinutes]);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-mono font-medium text-brown">
            {checkedInCount} of {totalItems} stops
          </span>
          <span className="text-xs font-mono text-muted">Day {day.day}</span>
        </div>
        <div className="w-full h-2 bg-border rounded-full overflow-hidden flex gap-0.5" role="progressbar" aria-valuenow={checkedInCount} aria-valuemin={0} aria-valuemax={totalItems} aria-label={`${checkedInCount} of ${totalItems} stops checked in`}>
          {day.items.map((_, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-colors ${
                checkedInItems.has(i)
                  ? "bg-gold"
                  : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Celebration message */}
      {checkedInCount === totalItems && totalItems > 0 && (
        <div className="text-center py-6 bg-gold/10 border border-gold/30 rounded-2xl">
          <p className="font-mono text-2xl font-bold text-gold mb-1">
            You crushed Day {day.day}!
          </p>
          <p className="font-mono text-sm text-secondary">
            Every stop, strictly handled.
          </p>
        </div>
      )}

      {/* Timeline */}
      {day.items.map((item, i) => {
        const matchedVenue = item.venueId ? venueById.get(item.venueId) : undefined;
        const isPast = i < currentItemIndex && !checkedInItems.has(i);
        const isCurrent = i === currentItemIndex && !checkedInItems.has(i);
        const isCheckedIn = checkedInItems.has(i);

        return (
          <div key={i}>
            <VenueCard
              item={item}
              venue={matchedVenue}
              isPast={isPast}
              isCurrent={isCurrent}
              isCheckedIn={isCheckedIn}
              onCheckIn={() => onCheckIn(i, item.venueId)}
            />
            {/* Travel indicator between items */}
            {item.travelToNext && i < day.items.length - 1 && (
              <div className="flex items-center gap-2 py-3 px-4">
                <div className="flex-1 border-t border-dashed border-border" />
                <span className="text-[11px] font-mono text-muted whitespace-nowrap">
                  {item.travelToNext.mode === "walking" ? "\u{1F6B6}" : item.travelToNext.mode === "transit" ? "\u{1F68C}" : "\u{1F697}"}{" "}
                  {item.travelToNext.summary}
                </span>
                <div className="flex-1 border-t border-dashed border-border" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
