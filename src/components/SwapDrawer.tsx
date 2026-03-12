"use client";

import { useEffect, useRef } from "react";
import type { ItineraryItem, Venue } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/constants";
import { haversineKm } from "@/lib/routing";

interface SwapDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItineraryItem;
  alternatives: Venue[];
  onSwap: (venue: Venue) => void;
}

export default function SwapDrawer({
  isOpen,
  onClose,
  item,
  alternatives,
  onSwap,
}: SwapDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categoryKey = item.type.toLowerCase();
  const config = CATEGORY_CONFIG[categoryKey] ?? {
    bg: "bg-muted/10",
    border: "border-muted/30",
    label: item.type.toUpperCase(),
    text: "text-muted",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-cream z-50 shadow-2xl overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="uppercase text-xs tracking-widest text-muted font-mono mb-1">
                Swap venue
              </p>
              <h3 className="font-mono text-lg font-bold text-brown">
                Replace {item.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-brown text-2xl font-mono transition-colors"
            >
              &times;
            </button>
          </div>

          {/* Current item */}
          <div className="mb-6 p-4 bg-surface border border-border rounded-xl opacity-60">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono rounded-full border ${config.bg} ${config.border} ${config.text}`}
              >
                {config.label}
              </span>
              <span className="text-[10px] font-mono text-muted">Current</span>
            </div>
            <p className="font-mono text-sm text-brown">{item.name}</p>
            {item.address && (
              <p className="text-[11px] font-mono text-muted mt-0.5 truncate">
                {item.address}
              </p>
            )}
          </div>

          {/* Alternatives */}
          {alternatives.length === 0 ? (
            <p className="font-mono text-sm text-muted text-center py-8">
              No alternatives available for this category in this area.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="uppercase text-xs tracking-widest text-muted font-mono">
                Alternatives ({alternatives.length})
              </p>
              {alternatives.map((venue) => {
                const dist =
                  item.lat && item.lng && venue.lat && venue.lng
                    ? haversineKm(item.lat, item.lng, venue.lat, venue.lng)
                    : null;

                return (
                  <button
                    key={venue.id}
                    onClick={() => onSwap(venue)}
                    className="w-full text-left p-4 bg-surface border border-border rounded-xl hover:border-gold transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono rounded-full border ${config.bg} ${config.border} ${config.text}`}
                          >
                            {config.label}
                          </span>
                          {venue.neighborhood && (
                            <span className="text-[10px] font-mono text-muted">
                              {venue.neighborhood}
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-sm text-brown font-medium">
                          {venue.name}
                        </p>
                        {venue.address && (
                          <p className="text-[11px] font-mono text-muted mt-0.5 truncate">
                            {venue.address}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {dist !== null && (
                          <span className="text-[10px] font-mono text-muted">
                            {dist < 1
                              ? `${Math.round(dist * 1000)}m`
                              : `${dist.toFixed(1)}km`}
                          </span>
                        )}
                        <span className="text-xs font-mono text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                          Swap &rarr;
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
