"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { HotelSelection, Venue } from "@/lib/types";
import { getCityData } from "@/lib/venues";

interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface HotelPickerProps {
  city: string;
  value: HotelSelection | null;
  onChange: (hotel: HotelSelection | null) => void;
}

export default function HotelPicker({
  city,
  value,
  onChange,
}: HotelPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stayVenues = useMemo(() => {
    if (!city) return [];
    const data = getCityData(city);
    if (!data) return [];
    return data.venues.filter((v) => v.category === "stay");
  }, [city]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/places?q=${encodeURIComponent(searchQuery + " " + city)}`
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, city]);

  const handleSelectVenue = (venue: Venue) => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    if (value?.venueId === venue.id) {
      onChange(null);
    } else {
      onChange({
        venueId: venue.id,
        name: venue.name,
        address: venue.address ?? undefined,
        lat: venue.lat ?? undefined,
        lng: venue.lng ?? undefined,
      });
    }
  };

  const handleSelectPlace = (place: PlaceResult) => {
    onChange({
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    });
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearchQuery("");
    setSuggestions([]);
  };

  if (!city) return null;

  // If a hotel is selected, show the selected state
  if (value) {
    return (
      <div>
        <label className="block uppercase text-xs tracking-widest text-muted font-mono mb-3">
          Where are you staying?
        </label>
        <div className="flex items-center gap-3 px-4 py-4 bg-stay/5 border border-stay/20 rounded-xl">
          <span className="text-stay text-sm">🏨</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono text-brown font-medium truncate">
              {value.name}
            </p>
            {value.address && (
              <p className="text-xs font-mono text-muted truncate">
                {value.address}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-mono text-muted hover:text-brown transition-colors shrink-0"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block uppercase text-xs tracking-widest text-muted font-mono mb-3">
        Where are you staying?
      </label>

      {/* Address search input */}
      <div className="relative mb-4">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Search hotel name or address..."
          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold transition-colors"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">
            ...
          </span>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((place) => (
              <button
                key={place.placeId}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectPlace(place)}
                className="w-full text-left px-4 py-3 hover:bg-light transition-colors border-b border-border last:border-b-0"
              >
                <p className="text-sm font-mono text-brown">{place.name}</p>
                <p className="text-xs font-mono text-muted truncate">
                  {place.address}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Denna's picks */}
      {stayVenues.length > 0 && (
        <>
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
            Or pick from Denna&apos;s list
          </p>
          <div className="grid gap-2">
            {stayVenues.map((venue) => (
              <button
                key={venue.id}
                type="button"
                onClick={() => handleSelectVenue(venue)}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-stay/40 bg-surface transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-brown flex-1 truncate">
                    {venue.name}
                  </span>
                  <span className="text-xs font-mono text-muted shrink-0">
                    {[venue.neighborhood, venue.price_indicator]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                {venue.denna_note && (
                  <p className="text-xs font-mono text-secondary mt-1 line-clamp-1">
                    {venue.denna_note}
                  </p>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
