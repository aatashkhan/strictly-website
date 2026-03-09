"use client";

import { useState, useMemo, useEffect } from "react";
import type { TripFormData, FlightInfo, HotelSelection } from "@/lib/types";
import { VIBES, COMPANIONS, BUDGETS, PACES, TRANSIT_MODES } from "@/lib/constants";
import type { TransitMode } from "@/lib/types";
import { getCities, getCityData } from "@/lib/venues";
import FlightInput from "./FlightInput";
import HotelPicker from "./HotelPicker";

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  initialCity?: string;
  initialData?: TripFormData | null;
}

function getMaxNights(venueCount: number): number {
  // ~8 venues per day is a full itinerary, cap at 7 nights
  return Math.min(7, Math.max(1, Math.floor(venueCount / 8)));
}

function calcNightsFromDates(arrDate: string, depDate: string): number | null {
  if (!arrDate || !depDate) return null;
  const a = new Date(arrDate + "T00:00:00");
  const d = new Date(depDate + "T00:00:00");
  const diff = Math.round((d.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

export default function TripForm({ onSubmit, initialCity, initialData }: TripFormProps) {
  const allCities = getCities();

  const [city, setCity] = useState(initialData?.city ?? initialCity ?? "");
  const [citySearch, setCitySearch] = useState(initialData?.city ?? initialCity ?? "");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [hotel, setHotel] = useState<HotelSelection | null>(initialData?.hotel ?? null);
  const [arrival, setArrival] = useState<FlightInfo | null>(initialData?.arrival ?? null);
  const [departure, setDeparture] = useState<FlightInfo | null>(initialData?.departure ?? null);
  const [duration, setDuration] = useState(initialData?.duration ?? "");
  const [companions, setCompanions] = useState(initialData?.companions ?? "");
  const [vibes, setVibes] = useState<string[]>(initialData?.vibes ?? []);
  const [budget, setBudget] = useState(initialData?.budget ?? "");
  const [pace, setPace] = useState(initialData?.pace ?? "balanced");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [transitPreference, setTransitPreference] = useState<TransitMode>(initialData?.transitPreference ?? "auto");
  const [durationError, setDurationError] = useState("");

  const filteredCities = useMemo(() => {
    if (!citySearch) return allCities;
    return allCities.filter((c) =>
      c.toLowerCase().includes(citySearch.toLowerCase())
    );
  }, [citySearch, allCities]);

  // City venue data for max duration calc
  const cityData = useMemo(() => {
    if (!city) return null;
    return getCityData(city);
  }, [city]);

  const maxNights = useMemo(() => {
    if (!cityData) return 7;
    return getMaxNights(cityData.venue_count);
  }, [cityData]);

  const availableDurations = useMemo(() => {
    return ["1", "2", "3", "4", "5", "7"].filter((d) => parseInt(d) <= maxNights);
  }, [maxNights]);

  // Auto-calculate duration from arrival/departure dates
  const autoNights = useMemo(() => {
    const arrDate = arrival?.date;
    const depDate = departure?.date;
    if (!arrDate || !depDate) return null;
    return calcNightsFromDates(arrDate, depDate);
  }, [arrival?.date, departure?.date]);

  // When auto-nights is calculated, update duration and check bounds
  useEffect(() => {
    if (autoNights !== null) {
      if (autoNights > maxNights) {
        setDurationError(
          `We have enough picks for ${maxNights} night${maxNights !== 1 ? "s" : ""} in ${city}. Adjust your dates or we'll plan for ${maxNights} nights.`
        );
        setDuration(String(maxNights));
      } else if (autoNights < 1) {
        setDurationError("Departure must be after arrival.");
        setDuration("");
      } else {
        setDurationError("");
        setDuration(String(autoNights));
      }
    } else {
      setDurationError("");
    }
  }, [autoNights, maxNights, city]);

  // If manual duration exceeds max, show error
  useEffect(() => {
    if (duration && parseInt(duration) > maxNights && !autoNights) {
      setDuration(String(maxNights));
      setDurationError(
        `We have enough picks for up to ${maxNights} night${maxNights !== 1 ? "s" : ""} in ${city}.`
      );
    }
  }, [maxNights, city, duration, autoNights]);

  const toggleVibe = (vibe: string) => {
    setVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  const canSubmit = city && vibes.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      city,
      duration: duration || String(Math.min(3, maxNights)),
      companions: companions || "Solo",
      vibes,
      budget: budget || "Treat yourself",
      pace: pace || "balanced",
      notes,
      email: "",
      arrival,
      departure,
      hotel,
      transitPreference,
    });
  };

  const handleCitySelect = (c: string) => {
    setCity(c);
    setCitySearch(c);
    setShowCityDropdown(false);
    setHotel(null);
    setDuration("");
    setDurationError("");
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-10">
      <h2 className="font-mono font-bold text-3xl md:text-4xl text-brown text-center">
        Tell me about your dream trip
      </h2>

      {/* City */}
      <div>
        <label className="block uppercase text-xs tracking-widest text-muted font-mono mb-3">
          City
        </label>
        <div className="relative">
          <input
            type="text"
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              setCity("");
              setHotel(null);
              setShowCityDropdown(true);
            }}
            onFocus={() => setShowCityDropdown(true)}
            onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
            placeholder="Search for a city..."
            className="w-full px-4 py-3 pr-10 bg-surface border border-border rounded-xl text-sm font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold transition-colors"
          />
          {city && (
            <button
              type="button"
              onClick={() => {
                setCity("");
                setCitySearch("");
                setHotel(null);
                setDuration("");
                setDurationError("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-muted hover:text-brown hover:bg-border/50 transition-colors text-lg leading-none"
              aria-label="Clear city"
            >
              &times;
            </button>
          )}
          {showCityDropdown && filteredCities.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {filteredCities.map((c) => {
                const data = getCityData(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleCitySelect(c)}
                    className="w-full text-left px-4 py-3 text-sm font-mono text-brown hover:bg-light flex justify-between items-center transition-colors"
                  >
                    <span>{c}</span>
                    <span className="text-xs text-muted">
                      {data?.venue_count ?? 0} spots
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hotel — shows after city selection */}
      {city && <HotelPicker city={city} value={hotel} onChange={setHotel} />}

      {/* Arrival */}
      <FlightInput label="Arrival" value={arrival} onChange={setArrival} />

      {/* Departure */}
      <FlightInput label="Departure" value={departure} onChange={setDeparture} />

      {/* Duration */}
      <div>
        <label className="block uppercase text-xs tracking-widest text-muted font-mono mb-3">
          Duration
          {city && (
            <span className="normal-case tracking-normal ml-2 text-secondary">
              (up to {maxNights} night{maxNights !== 1 ? "s" : ""} for {city})
            </span>
          )}
        </label>

        {autoNights !== null && autoNights > 0 ? (
          /* Auto-calculated from dates — show as pill */
          <div className="flex items-center gap-3">
            <span className="inline-block px-5 py-2 rounded-full bg-gold text-white text-sm font-mono">
              {Math.min(autoNights, maxNights)} night{Math.min(autoNights, maxNights) !== 1 ? "s" : ""} (from your dates)
            </span>
          </div>
        ) : (
          /* Manual selection */
          <div className="flex flex-wrap gap-3">
            {availableDurations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { setDuration(d); setDurationError(""); }}
                className={`px-5 py-2 rounded-full border text-sm font-mono transition-all ${
                  duration === d
                    ? "bg-brown text-cream border-brown"
                    : "border-border text-secondary hover:border-gold"
                }`}
              >
                {d} night{d !== "1" ? "s" : ""}
              </button>
            ))}
          </div>
        )}

        {durationError && (
          <p className="mt-2 text-sm font-mono text-gold">{durationError}</p>
        )}
      </div>

      {/* Companions */}
      <div>
        <label className="block uppercase text-xs tracking-widest text-muted font-mono mb-3">
          Who&apos;s coming?
        </label>
        <div className="flex flex-wrap gap-3">
          {COMPANIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCompanions(c)}
              className={`px-5 py-2 rounded-full border text-sm font-mono transition-all ${
                companions === c
                  ? "bg-brown text-cream border-brown"
                  : "border-border text-secondary hover:border-gold"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Vibes */}
      <div>
        <label className="block uppercase text-xs tracking-widest text-muted font-mono mb-3">
          Vibes (pick a few)
        </label>
        <div className="flex flex-wrap gap-3">
          {VIBES.map((v) => (
            <button
              key={v.label}
              type="button"
              onClick={() => toggleVibe(v.label)}
              className={`px-5 py-2 rounded-full border text-sm font-mono transition-all ${
                vibes.includes(v.label)
                  ? "bg-brown text-cream border-brown"
                  : "border-border text-secondary hover:border-gold"
              }`}
            >
              {v.emoji} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="block uppercase text-xs tracking-widest text-muted font-mono mb-3">
          Budget
        </label>
        <div className="flex flex-wrap gap-3">
          {BUDGETS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBudget(b)}
              className={`px-5 py-2 rounded-full border text-sm font-mono transition-all ${
                budget === b
                  ? "bg-brown text-cream border-brown"
                  : "border-border text-secondary hover:border-gold"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Pace */}
      <div>
        <label className="block uppercase text-xs tracking-widest text-muted font-mono mb-3">
          Pace
        </label>
        <div className="flex flex-wrap gap-3">
          {PACES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPace(p.value)}
              className={`px-5 py-2 rounded-full border text-sm font-mono transition-all ${
                pace === p.value
                  ? "bg-brown text-cream border-brown"
                  : "border-border text-secondary hover:border-gold"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {pace && (
          <p className="mt-2 text-xs font-mono text-muted">
            {PACES.find((p) => p.value === pace)?.desc}
          </p>
        )}
      </div>

      {/* Transit Preference */}
      <div>
        <label className="block uppercase text-xs tracking-widest text-muted font-mono mb-3">
          How do you get around?
        </label>
        <div className="flex flex-wrap gap-3">
          {TRANSIT_MODES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTransitPreference(t.value as TransitMode)}
              className={`px-5 py-2 rounded-full border text-sm font-mono transition-all ${
                transitPreference === t.value
                  ? "bg-brown text-cream border-brown"
                  : "border-border text-secondary hover:border-gold"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        {transitPreference && (
          <p className="mt-2 text-xs font-mono text-muted">
            {TRANSIT_MODES.find((t) => t.value === transitPreference)?.desc}
          </p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block uppercase text-xs tracking-widest text-muted font-mono mb-3">
          Anything else? (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Dietary restrictions, must-dos, neighborhoods you love..."
          rows={3}
          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold transition-colors resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full py-4 rounded-full font-mono text-sm transition-all ${
          canSubmit
            ? "bg-gold text-white hover:bg-gold/90 cursor-pointer"
            : "bg-border text-muted cursor-not-allowed"
        }`}
      >
        Build My Itinerary
      </button>
    </form>
  );
}
