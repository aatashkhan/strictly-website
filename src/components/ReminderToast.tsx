"use client";

import { useState, useEffect } from "react";
import type { ItineraryItem } from "@/lib/types";

interface ReminderToastProps {
  item: ItineraryItem;
  minutesUntil: number;
  onDismiss: () => void;
}

export default function ReminderToast({ item, minutesUntil, onDismiss }: ReminderToastProps) {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // wait for animation
    }, 30000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const mapsUrl = item.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`
    : null;

  return (
    <div
      className={`fixed bottom-6 left-4 right-4 max-w-md mx-auto z-[70] transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="bg-cream border border-gold/40 shadow-xl rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs font-mono text-gold uppercase tracking-wider mb-1">
              In ~{minutesUntil} min
            </p>
            <p className="font-mono text-lg font-bold text-brown mb-1">
              Head to {item.name}
            </p>
            {item.travelToNext && (
              <p className="text-xs font-mono text-muted">
                {item.travelToNext.summary} away
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted hover:text-brown text-xl font-mono shrink-0"
          >
            &times;
          </button>
        </div>

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 text-center px-4 py-2.5 rounded-xl bg-gold text-white text-sm font-mono hover:bg-gold/90 transition-colors"
          >
            Open in Maps
          </a>
        )}
      </div>
    </div>
  );
}
