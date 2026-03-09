"use client";

import { useState } from "react";
import type { ItineraryItem, Venue } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/constants";

interface VenueCardProps {
  item: ItineraryItem;
  venue?: Venue;
  isPast: boolean;
  isCurrent: boolean;
  isCheckedIn: boolean;
  distanceInfo?: string;
  onCheckIn: () => void;
}

export default function VenueCard({
  item,
  venue,
  isPast,
  isCurrent,
  isCheckedIn,
  distanceInfo,
  onCheckIn,
}: VenueCardProps) {
  const [showDetails, setShowDetails] = useState(isCurrent);
  const categoryKey = item.type.toLowerCase();
  const config = CATEGORY_CONFIG[categoryKey] ?? {
    bg: "bg-muted/10",
    border: "border-muted/30",
    label: item.type.toUpperCase(),
    text: "text-muted",
  };

  // Opening hours check
  const getOpenStatus = () => {
    if (!venue?.opening_hours?.weekday_text?.length) return null;
    const today = new Date().getDay();
    // Google's weekday_text is Mon-Sun (0-6), JS getDay is Sun=0
    const idx = today === 0 ? 6 : today - 1;
    return venue.opening_hours.weekday_text[idx] || null;
  };

  const openStatus = getOpenStatus();

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        isCheckedIn
          ? "border-green-600/30 bg-green-600/5 opacity-70"
          : isCurrent
          ? "border-gold shadow-lg shadow-gold/10 bg-gold/5"
          : isPast
          ? "border-border opacity-50"
          : "border-border"
      }`}
    >
      {/* Time + Category */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-medium text-brown">
            {item.time}
          </span>
          {item.endTime && (
            <span className="text-xs font-mono text-muted">— {item.endTime}</span>
          )}
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full border ${config.bg} ${config.border} ${config.text}`}
        >
          {config.label}
        </span>
      </div>

      {/* Venue name */}
      <h3 className="font-mono text-xl font-bold text-brown mb-1">{item.name}</h3>

      {/* Address */}
      {item.address && (
        <p className="text-xs font-mono text-muted mb-2">{item.address}</p>
      )}

      {/* Denna's note */}
      <p className="font-mono text-secondary text-sm leading-relaxed mb-3">
        {item.note}
      </p>

      {/* Current venue indicator */}
      {isCurrent && !isCheckedIn && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gold/10 border border-gold/30 rounded-lg">
          <span className="text-gold text-sm font-mono font-medium">You should be here</span>
          {distanceInfo && (
            <span className="text-xs font-mono text-gold/70">— {distanceInfo}</span>
          )}
        </div>
      )}

      {isCheckedIn && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-600/10 border border-green-600/30 rounded-lg">
          <span className="text-green-700 text-sm font-mono font-medium">Checked in</span>
        </div>
      )}

      {/* Open status */}
      {openStatus && (
        <p className="text-xs font-mono text-muted mb-3">{openStatus}</p>
      )}

      {/* Details toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full text-[11px] font-mono transition-all border ${
          showDetails
            ? "bg-gold/15 border-gold/40 text-gold"
            : "bg-surface border-border text-secondary hover:border-gold hover:text-gold"
        }`}
      >
        <span>{showDetails ? "Hide details" : "Hours, maps & links"}</span>
      </button>

      {showDetails && venue && (
        <div className="p-3 bg-surface rounded-lg border border-border text-xs font-mono space-y-1.5 mb-3">
          {venue.opening_hours?.weekday_text?.map((line, i) => (
            <div key={i} className="text-secondary">{line}</div>
          ))}
          {venue.price_indicator && (
            <div><span className="text-muted">Price: </span><span className="text-secondary">{venue.price_indicator}</span></div>
          )}
          <div className="flex flex-wrap gap-3 pt-1">
            {venue.google_maps_url && (
              <a href={venue.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-brown transition-colors">
                Google Maps &rarr;
              </a>
            )}
            {venue.instagram && (
              <a
                href={venue.instagram.startsWith("http") ? venue.instagram : `https://instagram.com/${venue.instagram.replace("@", "")}`}
                target="_blank" rel="noopener noreferrer" className="text-gold hover:text-brown transition-colors"
              >
                Instagram &rarr;
              </a>
            )}
            {venue.website && (
              <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-brown transition-colors">
                Website &rarr;
              </a>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {/* Open in Maps — prominent */}
        {(venue?.google_maps_url || item.address) && (
          <a
            href={venue?.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address || item.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-4 py-2.5 rounded-xl border border-border text-sm font-mono text-secondary hover:border-gold hover:text-gold transition-all"
          >
            Open in Maps
          </a>
        )}

        {/* Check-in button */}
        {!isCheckedIn && !isPast && (
          <button
            onClick={onCheckIn}
            className="flex-1 text-center px-4 py-2.5 rounded-xl bg-gold text-white text-sm font-mono hover:bg-gold/90 transition-colors"
          >
            I&apos;m here
          </button>
        )}
      </div>
    </div>
  );
}
