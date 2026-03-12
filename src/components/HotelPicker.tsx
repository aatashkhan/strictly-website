"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { HotelSelection, Venue } from "@/lib/types";

/** Haversine distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_STAY_DISTANCE_KM = 80;

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

function HotelCard({
  venue,
  isSelected,
  onSelect,
}: {
  venue: Venue;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`w-full text-left rounded-xl border transition-all ${
        isSelected
          ? "border-stay bg-stay/5"
          : "border-border hover:border-stay/40 bg-surface"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3"
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
          <span className="text-[10px] text-muted shrink-0 transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
            ▼
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {(() => {
            const imgs = venue.image_urls?.length ? venue.image_urls : venue.image_url ? [venue.image_url] : [];
            const img = imgs.length > 0 ? imgs[Math.floor(Math.random() * imgs.length)] : null;
            return img ? <img src={img} alt={venue.name} className="w-full h-32 object-cover rounded-lg" /> : null;
          })()}
          {venue.address && (
            <p className="text-[10px] font-mono text-muted">
              {venue.address}
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-stay hover:underline"
              >
                Website
              </a>
            )}
            {venue.instagram && (
              <a
                href={venue.instagram.startsWith("http") ? venue.instagram : `https://instagram.com/${venue.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-stay hover:underline"
              >
                Instagram
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="w-full px-3 py-2 bg-stay/10 border border-stay/30 text-stay rounded-lg text-xs font-mono hover:bg-stay/20 transition-colors"
          >
            {isSelected ? "Selected ✓" : "Select this hotel"}
          </button>
        </div>
      )}
    </div>
  );
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
  const [cityVenues, setCityVenues] = useState<Venue[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch city venues from API when city changes
  useEffect(() => {
    if (!city) {
      setCityVenues([]);
      return;
    }
    fetch(`/api/venues/${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((data) => {
        setCityVenues(data?.venues ?? []);
      })
      .catch(() => setCityVenues([]));
  }, [city]);

  // Get city center from venue coordinates for location-biased hotel search
  const cityCenter = useMemo(() => {
    const withCoords = cityVenues.filter((v) => v.lat && v.lng);
    if (withCoords.length === 0) return null;
    const avgLat = withCoords.reduce((s, v) => s + (v.lat || 0), 0) / withCoords.length;
    const avgLng = withCoords.reduce((s, v) => s + (v.lng || 0), 0) / withCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [cityVenues]);

  // Filter stay venues: exclude closed, and exclude any that are too far from city center
  const stayVenues = useMemo(() => {
    return cityVenues.filter((v) => {
      if (v.category !== "stay") return false;
      if (v.status === "closed") return false;
      if (cityCenter && v.lat && v.lng) {
        const dist = haversineKm(cityCenter.lat, cityCenter.lng, v.lat, v.lng);
        if (dist > MAX_STAY_DISTANCE_KM) return false;
      }
      return true;
    });
  }, [cityVenues, cityCenter]);

  // Split into city hotels vs nearby getaways
  const cityHotels = useMemo(
    () => stayVenues.filter((v) => !v.nearby_getaway),
    [stayVenues]
  );
  const nearbyGetaways = useMemo(
    () => stayVenues.filter((v) => v.nearby_getaway),
    [stayVenues]
  );

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
        let url = `/api/places?q=${encodeURIComponent(searchQuery + " " + city)}`;
        if (cityCenter) {
          url += `&lat=${cityCenter.lat.toFixed(4)}&lng=${cityCenter.lng.toFixed(4)}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        const results = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, city, cityCenter]);

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
              <p className="text-xs font-mono text-muted/60 line-clamp-2">
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

      {cityHotels.length > 0 && (
        <>
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
            Denna&apos;s picks in {city}
          </p>
          <div className="grid gap-2 mb-4">
            {cityHotels.map((venue) => (
              <HotelCard
                key={venue.id}
                venue={venue}
                isSelected={false}
                onSelect={() => handleSelectVenue(venue)}
              />
            ))}
          </div>
        </>
      )}

      {nearbyGetaways.length > 0 && (
        <>
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
            Nearby getaways
          </p>
          <div className="grid gap-2">
            {nearbyGetaways.map((venue) => (
              <HotelCard
                key={venue.id}
                venue={venue}
                isSelected={false}
                onSelect={() => handleSelectVenue(venue)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
