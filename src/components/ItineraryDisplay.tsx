"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { ItineraryData, ItineraryDay, ItineraryItem, TripFormData, TravelSegment, Venue } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/constants";
import { useItineraryState, findAlternatives, getUsedVenueIds } from "@/lib/itineraryState";
import SwapDrawer from "./SwapDrawer";
import ChatPanel from "./ChatPanel";
import ExportButton from "./ExportButton";
import "mapbox-gl/dist/mapbox-gl.css";

const DayMap = dynamic(() => import("./DayMap"), { ssr: false });
const FullTripMap = dynamic(() => import("./FullTripMap"), { ssr: false });

interface ItineraryDisplayProps {
  data: ItineraryData | null;
  tripData: TripFormData;
  venues: Venue[];
  onBack: () => void;
  onEdit?: () => void;
}

function HotelCard({ name, address }: { name: string; address?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 bg-stay/5 border border-stay/20 rounded-xl">
      <span className="text-stay text-lg font-mono">[H]</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-widest text-stay font-mono">
          Your home base
        </p>
        <p className="text-sm font-mono text-brown font-medium">{name}</p>
        {address && (
          <p className="text-xs font-mono text-muted truncate">{address}</p>
        )}
      </div>
      <span className="ml-auto inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono rounded-full border bg-stay/10 border-stay/30 text-stay shrink-0">
        Stay
      </span>
    </div>
  );
}

function TravelIndicator({ travel }: { travel: TravelSegment }) {
  const icon = travel.mode === 'walking' ? '\u{1F6B6}' : travel.mode === 'transit' ? '\u{1F68C}' : '\u{1F697}';
  return (
    <div className="flex items-center gap-2 py-2 pl-24">
      <div className="flex-1 border-t border-dashed border-border" />
      <span className="text-[11px] font-mono text-muted whitespace-nowrap">
        {icon} {travel.summary} ({travel.distance})
      </span>
      <div className="flex-1 border-t border-dashed border-border" />
    </div>
  );
}

function WarningBadge({ message }: { message: string }) {
  return (
    <div className="mt-1.5 flex items-start gap-1.5">
      <span className="text-xs shrink-0 mt-px">&#9888;&#65039;</span>
      <span className="text-xs font-mono text-amber-700 leading-snug">{message}</span>
    </div>
  );
}

function formatDayDate(dayIndex: number, arrivalDate?: string): string | null {
  if (!arrivalDate) return null;
  try {
    const date = new Date(arrivalDate + "T00:00:00");
    date.setDate(date.getDate() + dayIndex);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

function getFlightTimeLabel(time?: string): string {
  const labels: Record<string, string> = {
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    "late-night": "late night",
  };
  return time ? labels[time] ?? time : "";
}

/** QoL 2: Category balance — count items per category for a day */
function CategoryBalance({ items }: { items: ItineraryItem[] }) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const cat = item.type.toLowerCase();
    counts[cat] = (counts[cat] || 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {entries.map(([cat, count]) => {
        const config = CATEGORY_CONFIG[cat];
        return (
          <span
            key={cat}
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
              config ? `${config.bg} ${config.border} ${config.text}` : "bg-muted/10 border-muted/30 text-muted"
            }`}
          >
            {count} {config?.label?.toLowerCase() ?? cat}
          </span>
        );
      })}
    </div>
  );
}

/** QoL 1: Venue detail card — expandable details */
function VenueDetails({ venue }: { venue: Venue | undefined }) {
  if (!venue) return null;
  return (
    <div className="mt-2 p-3 bg-surface rounded-lg border border-border text-xs font-mono space-y-1.5">
      {venue.opening_hours?.weekday_text && venue.opening_hours.weekday_text.length > 0 && (
        <div>
          <span className="text-muted">Hours today: </span>
          <span className="text-secondary">{venue.opening_hours.weekday_text[0]}</span>
        </div>
      )}
      {venue.price_indicator && (
        <div>
          <span className="text-muted">Price: </span>
          <span className="text-secondary">{venue.price_indicator}</span>
        </div>
      )}
      {venue.subcategory && (
        <div>
          <span className="text-muted">Type: </span>
          <span className="text-secondary">{venue.subcategory}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-3 pt-1">
        {venue.google_maps_url && (
          <a
            href={venue.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:text-brown transition-colors"
          >
            Google Maps &rarr;
          </a>
        )}
        {venue.instagram && (
          <a
            href={venue.instagram.startsWith("http") ? venue.instagram : `https://instagram.com/${venue.instagram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:text-brown transition-colors"
          >
            Instagram &rarr;
          </a>
        )}
        {venue.website && (
          <a
            href={venue.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:text-brown transition-colors"
          >
            Website &rarr;
          </a>
        )}
      </div>
    </div>
  );
}

/** QoL 7: Copy a single day as text */
function copyDayToClipboard(day: ItineraryDay, dayDate: string | null) {
  const lines: string[] = [];
  lines.push(`Day ${day.day}${dayDate ? ` — ${dayDate}` : ""}: ${day.title}`);
  lines.push("");
  for (const item of day.items) {
    const timeRange = item.endTime ? `${item.time} – ${item.endTime}` : item.time;
    lines.push(`${timeRange} · ${item.name}`);
    if (item.address) lines.push(`  ${item.address}`);
    lines.push(`  ${item.note}`);
    lines.push("");
  }
  navigator.clipboard.writeText(lines.join("\n")).catch(() => {
    // silent fallback
  });
}

export default function ItineraryDisplay({
  data,
  tripData,
  venues,
  onBack,
  onEdit,
}: ItineraryDisplayProps) {
  const [openDays, setOpenDays] = useState<Set<number>>(() => new Set([1]));
  const [chatOpen, setChatOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [copiedDay, setCopiedDay] = useState<number | null>(null);

  // Swap drawer state
  const [swapTarget, setSwapTarget] = useState<{
    dayIndex: number;
    itemIndex: number;
    item: ItineraryItem;
  } | null>(null);

  // State management with undo/redo
  const {
    itinerary,
    canUndo,
    canRedo,
    swapVenue,
    updateFromChat,
    undo,
    redo,
  } = useItineraryState(data!, venues, tripData.arrival?.date);

  // Compute alternatives for swap drawer
  const swapAlternatives = useMemo(() => {
    if (!swapTarget) return [];
    const usedIds = getUsedVenueIds(itinerary);
    return findAlternatives(swapTarget.item, venues, usedIds);
  }, [swapTarget, itinerary, venues]);

  // Build a venue lookup by ID for detail expansion
  const venueById = useMemo(() => {
    const map = new Map<string, Venue>();
    for (const v of venues) map.set(v.id, v);
    return map;
  }, [venues]);

  const toggleDay = (day: number) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  // QoL 8: Expand/collapse all
  const allExpanded = itinerary.days.length > 0 && openDays.size === itinerary.days.length;
  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setOpenDays(new Set());
    } else {
      setOpenDays(new Set(itinerary.days.map((d) => d.day)));
    }
  }, [allExpanded, itinerary.days]);

  // QoL 1: Toggle venue detail expansion
  const toggleItemExpand = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // QoL 7: Copy day with feedback
  const handleCopyDay = (day: ItineraryDay, dayDate: string | null) => {
    copyDayToClipboard(day, dayDate);
    setCopiedDay(day.day);
    setTimeout(() => setCopiedDay(null), 2000);
  };

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 px-6">
        <h2 className="font-mono text-3xl font-bold text-brown mb-4">
          Something went wrong
        </h2>
        <p className="font-mono text-secondary mb-8">
          We couldn&apos;t generate your itinerary. Please try again.
        </p>
        <button
          onClick={onBack}
          className="px-8 py-3 bg-gold text-white font-mono text-sm rounded-full hover:bg-gold/90 transition-colors"
        >
          Start Over
        </button>
      </div>
    );
  }

  const hasArrival = tripData.arrival && tripData.arrival.type !== "skip";
  const hasDeparture = tripData.departure && tripData.departure.type !== "skip";
  const arrivalDate = tripData.arrival?.date;
  const totalDays = itinerary.days.length;

  const handleSwapOpen = (dayIndex: number, itemIndex: number, item: ItineraryItem) => {
    setSwapTarget({ dayIndex, itemIndex, item });
  };

  const handleSwapSelect = (venue: Venue) => {
    if (!swapTarget) return;
    swapVenue(swapTarget.dayIndex, swapTarget.itemIndex, venue);
    setSwapTarget(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
          <button
            onClick={onBack}
            className="text-sm font-mono text-secondary hover:text-brown transition-colors"
          >
            &larr; Start Over
          </button>
          {onEdit && (
            <>
              <span className="text-border">|</span>
              <button
                onClick={onEdit}
                className="text-sm font-mono text-gold hover:text-brown transition-colors"
              >
                Edit Trip Details
              </button>
            </>
          )}
        </div>

        <p className="uppercase text-gold text-xs tracking-[0.3em] font-mono mb-3">
          Your Strict Itinerary
        </p>
        <h1 className="font-mono font-bold text-4xl md:text-5xl text-brown mb-4">
          Strictly {tripData.city}
        </h1>
        <p className="font-mono text-secondary text-sm">
          {tripData.duration} nights &middot; {tripData.companions} &middot;{" "}
          {tripData.vibes.join(", ")}
        </p>
      </div>

      {/* Action bar: undo/redo, chat, export */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              canUndo
                ? "text-secondary hover:text-brown hover:bg-surface"
                : "text-muted/40 cursor-not-allowed"
            }`}
            title="Undo last change"
          >
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              canRedo
                ? "text-secondary hover:text-brown hover:bg-surface"
                : "text-muted/40 cursor-not-allowed"
            }`}
            title="Redo"
          >
            Redo
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setChatOpen(true)}
            className="px-5 py-2 rounded-full border border-border text-sm font-mono text-secondary hover:border-gold hover:text-brown transition-all"
          >
            Refine with AI
          </button>
          <ExportButton itinerary={itinerary} tripData={tripData} />
        </div>
      </div>

      {/* Intro */}
      <p className="font-mono text-secondary leading-relaxed mb-12 text-center max-w-lg mx-auto">
        {itinerary.intro}
      </p>

      {/* Full trip overview map */}
      <FullTripMap data={itinerary} hotel={tripData.hotel} />

      {/* Hotel card */}
      {tripData.hotel && (
        <div className="mb-8">
          <HotelCard name={tripData.hotel.name} address={tripData.hotel.address} />
        </div>
      )}

      {/* QoL 8: Expand/Collapse All */}
      <div className="flex justify-end mb-3">
        <button
          onClick={toggleAll}
          className="text-[11px] font-mono text-muted hover:text-brown transition-colors"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {/* Days accordion */}
      <div className="space-y-4">
        {itinerary.days.map((day, dayIdx) => {
          const isOpen = openDays.has(day.day);
          const dayDate = formatDayDate(day.day - 1, arrivalDate);
          const isFirstDay = day.day === 1;
          const isLastDay = day.day === totalDays;
          return (
            <div
              key={day.day}
              className="border border-border rounded-2xl overflow-hidden"
            >
              {/* Day header */}
              <button
                onClick={() => toggleDay(day.day)}
                className="w-full flex items-center justify-between px-6 py-5 bg-light/50 hover:bg-light transition-colors"
              >
                <div className="text-left">
                  <span className="uppercase text-xs tracking-widest text-gold font-mono block mb-1">
                    Day {day.day}{dayDate ? ` \u2014 ${dayDate}` : ""}
                  </span>
                  <span className="font-mono text-xl font-bold text-brown">
                    {day.title}
                  </span>
                  {/* QoL 2: Category balance */}
                  {!isOpen && <CategoryBalance items={day.items} />}
                </div>
                <span
                  className={`text-2xl text-muted transition-transform duration-300 ${
                    isOpen ? "rotate-45" : "rotate-0"
                  }`}
                >
                  +
                </span>
              </button>

              {/* Day map + items */}
              {isOpen && (
                <div className="px-6 py-4">
                  <DayMap day={day} hotel={tripData.hotel} />
                </div>
              )}
              {isOpen && (
                <div className="px-6 py-4 pt-0">
                  {/* QoL 7: Copy day button */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyDay(day, dayDate); }}
                      className="text-[10px] font-mono text-muted hover:text-gold transition-colors"
                    >
                      {copiedDay === day.day ? "Copied!" : "Copy day"}
                    </button>
                  </div>

                  {/* Arrival flight item at start of Day 1 */}
                  {isFirstDay && hasArrival && tripData.arrival && (
                    <div className="mb-2">
                      <div className="flex gap-4 py-3">
                        <div className="w-20 shrink-0 pt-1 text-right">
                          <span className="text-xs font-mono text-gold font-medium tracking-wide">
                            {tripData.arrival.type === "flight" ? "Arrive" : getFlightTimeLabel(tripData.arrival.time) || "Arrive"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono rounded-full border bg-gold/10 border-gold/30 text-gold">
                              Flight
                            </span>
                          </div>
                          <h4 className="font-mono text-lg text-brown mb-1">
                            {tripData.arrival.type === "flight" && tripData.arrival.flightNumber
                              ? `Flight ${tripData.arrival.flightNumber}`
                              : `Arrive in ${tripData.city}`}
                          </h4>
                          <p className="font-mono text-secondary text-sm leading-relaxed">
                            {tripData.arrival.airport ? `Landing at ${tripData.arrival.airport}. ` : ""}
                            {tripData.hotel ? `Head to ${tripData.hotel.name} to drop bags and freshen up.` : "Drop your bags and settle in."}
                          </p>
                        </div>
                      </div>
                      {day.items.length > 0 && (
                        <div className="flex items-center gap-2 py-2 pl-24">
                          <div className="flex-1 border-t border-dashed border-gold/30" />
                          <span className="text-[11px] font-mono text-gold whitespace-nowrap">
                            {tripData.hotel ? "settle in, then..." : "then..."}
                          </span>
                          <div className="flex-1 border-t border-dashed border-gold/30" />
                        </div>
                      )}
                    </div>
                  )}

                  {day.items.map((item, i) => {
                    const categoryKey = item.type.toLowerCase();
                    const config = CATEGORY_CONFIG[categoryKey] ?? {
                      bg: "bg-muted/10",
                      border: "border-muted/30",
                      label: item.type.toUpperCase(),
                      text: "text-muted",
                    };
                    const itemKey = `${dayIdx}-${i}`;
                    const isExpanded = expandedItems.has(itemKey);
                    const matchedVenue = item.venueId ? venueById.get(item.venueId) : undefined;

                    return (
                      <div key={i}>
                        <div className="flex gap-4 py-3 group">
                          {/* Time label */}
                          <div className="w-20 shrink-0 pt-1 text-right">
                            <span className="text-xs font-mono text-brown font-medium tracking-wide">
                              {item.time}
                            </span>
                            {item.endTime && (
                              <span className="block text-[10px] font-mono text-muted mt-0.5">
                                — {item.endTime}
                              </span>
                            )}
                            {item.duration && (
                              <span className="block text-[10px] font-mono text-muted mt-0.5">
                                {item.duration} min
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono rounded-full border ${config.bg} ${config.border} ${config.text}`}
                              >
                                {config.label}
                              </span>
                              {/* QoL 4: Swap button — visible on mobile, hover on desktop */}
                              <button
                                onClick={() => handleSwapOpen(dayIdx, i, item)}
                                className="md:opacity-0 md:group-hover:opacity-100 text-[10px] font-mono text-muted hover:text-gold transition-all px-2 py-0.5 rounded-full border border-transparent hover:border-gold/30"
                              >
                                Swap
                              </button>
                            </div>
                            {/* Venue name */}
                            <h4 className="font-mono text-lg text-brown mb-1">
                              {item.name}
                            </h4>
                            {/* Prominent details toggle */}
                            {matchedVenue && (
                              <button
                                onClick={() => toggleItemExpand(itemKey)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 mb-1.5 rounded-full text-[11px] font-mono transition-all border ${
                                  isExpanded
                                    ? "bg-gold/15 border-gold/40 text-gold"
                                    : "bg-surface border-border text-secondary hover:border-gold hover:text-gold"
                                }`}
                              >
                                <span>{isExpanded ? "Hide details" : "Hours, maps & links"}</span>
                                <span className="text-[9px]">{isExpanded ? "\u25B4" : "\u25BE"}</span>
                              </button>
                            )}
                            {item.address && (
                              <p className="text-[11px] font-mono text-muted mb-1 truncate">
                                {item.address}
                              </p>
                            )}
                            <p className="font-mono text-secondary text-sm leading-relaxed">
                              {item.note}
                            </p>
                            {item.warnings?.map((w, wi) => (
                              <WarningBadge key={wi} message={w.message} />
                            ))}
                            {/* QoL 1: Expanded venue details */}
                            {isExpanded && <VenueDetails venue={matchedVenue} />}
                          </div>
                        </div>

                        {/* Travel to next stop */}
                        {item.travelToNext && (
                          <TravelIndicator travel={item.travelToNext} />
                        )}
                      </div>
                    );
                  })}

                  {/* Departure flight item at end of last day */}
                  {isLastDay && hasDeparture && tripData.departure && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 py-2 pl-24">
                        <div className="flex-1 border-t border-dashed border-gold/30" />
                        <span className="text-[11px] font-mono text-gold whitespace-nowrap">
                          time to head out...
                        </span>
                        <div className="flex-1 border-t border-dashed border-gold/30" />
                      </div>
                      <div className="flex gap-4 py-3">
                        <div className="w-20 shrink-0 pt-1 text-right">
                          <span className="text-xs font-mono text-gold font-medium tracking-wide">
                            {tripData.departure.type === "flight" ? "Depart" : getFlightTimeLabel(tripData.departure.time) || "Depart"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono rounded-full border bg-gold/10 border-gold/30 text-gold">
                              Flight
                            </span>
                          </div>
                          <h4 className="font-mono text-lg text-brown mb-1">
                            {tripData.departure.type === "flight" && tripData.departure.flightNumber
                              ? `Flight ${tripData.departure.flightNumber}`
                              : `Depart ${tripData.city}`}
                          </h4>
                          <p className="font-mono text-secondary text-sm leading-relaxed">
                            {tripData.departure.airport ? `Heading to ${tripData.departure.airport}. ` : ""}
                            {tripData.hotel ? `Check out of ${tripData.hotel.name} and ` : ""}
                            Safe travels — until next time!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Signoff */}
      <div className="mt-12 text-center">
        <p className="font-mono text-gold text-lg leading-relaxed max-w-md mx-auto">
          {itinerary.signoff}
        </p>
      </div>

      {/* Footer note */}
      <p className="mt-16 text-center text-xs font-mono text-muted">
        Every recommendation personally tested &amp; approved by Denna
      </p>

      {/* Swap Drawer */}
      <SwapDrawer
        isOpen={swapTarget !== null}
        onClose={() => setSwapTarget(null)}
        item={swapTarget?.item ?? { time: "", type: "", name: "", note: "" }}
        alternatives={swapAlternatives}
        onSwap={handleSwapSelect}
      />

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        itinerary={itinerary}
        tripData={tripData}
        onUpdate={updateFromChat}
      />
    </div>
  );
}
