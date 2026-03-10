"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { CATEGORY_CONFIG } from "@/lib/constants";
import type { TripFormData, ItineraryData, ItineraryItem, Venue } from "@/lib/types";
import dynamic from "next/dynamic";
import "mapbox-gl/dist/mapbox-gl.css";

const FullTripMap = dynamic(() => import("@/components/FullTripMap"), { ssr: false });
const DayMap = dynamic(() => import("@/components/DayMap"), { ssr: false });

export default function SharedTripPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [trip, setTrip] = useState<{
    city: string;
    trip_data: TripFormData;
    itinerary: ItineraryData;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    async function fetchShared() {
      try {
        // Fetch trip using share token (no auth needed — RLS allows SELECT when share_token IS NOT NULL)
        const res = await fetch(`/api/trips/${params.id}?share_token=${token}`);
        if (res.ok) {
          setTrip(await res.json());
        } else {
          setError("This trip link is invalid or has expired.");
        }
      } catch {
        setError("Failed to load shared trip.");
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchShared();
    else {
      setError("Missing share token.");
      setLoading(false);
    }
  }, [params.id, token]);

  const [cityVenues, setCityVenues] = useState<Venue[]>([]);

  useEffect(() => {
    if (!trip?.city) return;
    fetch(`/api/venues/${encodeURIComponent(trip.city)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setCityVenues(data?.venues ?? []))
      .catch(() => setCityVenues([]));
  }, [trip?.city]);

  const venueById = new Map<string, Venue>(cityVenues.map((v) => [v.id, v]));

  const toggleDay = (day: number) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  if (loading) {
    return (
      <main>
        <Nav />
        <div className="pt-32 pb-20 text-center">
          <p className="font-mono text-muted text-sm">Loading shared trip...</p>
        </div>
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main>
        <Nav />
        <div className="pt-32 pb-20 text-center px-6">
          <h2 className="font-mono text-2xl font-bold text-brown mb-4">{error}</h2>
        </div>
        <Footer />
      </main>
    );
  }

  const { itinerary, trip_data: tripData } = trip;

  return (
    <main>
      <Nav />
      <section className="pt-32 pb-20">
        <div className="max-w-2xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="uppercase text-gold text-xs tracking-[0.3em] font-mono mb-3">
              Shared Itinerary
            </p>
            <h1 className="font-mono font-bold text-4xl md:text-5xl text-brown mb-4">
              Strictly {tripData.city}
            </h1>
            <p className="font-mono text-secondary text-sm">
              {tripData.duration} nights &middot; {tripData.companions} &middot; {tripData.vibes?.join(", ")}
            </p>
          </div>

          {/* Intro */}
          <p className="font-mono text-secondary leading-relaxed mb-12 text-center max-w-lg mx-auto">
            {itinerary.intro}
          </p>

          {/* Full trip map */}
          <FullTripMap data={itinerary} hotel={tripData.hotel} />

          {/* Days */}
          <div className="space-y-4 mt-8">
            {itinerary.days.map((day) => {
              const isOpen = openDays.has(day.day);
              return (
                <div key={day.day} className="border border-border rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleDay(day.day)}
                    className="w-full flex items-center justify-between px-6 py-5 bg-light/50 hover:bg-light transition-colors"
                  >
                    <div className="text-left">
                      <span className="uppercase text-xs tracking-widest text-gold font-mono block mb-1">
                        Day {day.day}
                      </span>
                      <span className="font-mono text-xl font-bold text-brown">{day.title}</span>
                    </div>
                    <span className={`text-2xl text-muted transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>+</span>
                  </button>

                  {isOpen && (
                    <div className="px-6 py-4">
                      <DayMap day={day} hotel={tripData.hotel} />
                      {day.items.map((item: ItineraryItem, i: number) => {
                        const categoryKey = item.type.toLowerCase();
                        const config = CATEGORY_CONFIG[categoryKey] ?? { bg: "bg-muted/10", border: "border-muted/30", label: item.type, text: "text-muted" };
                        const venue = item.venueId ? venueById.get(item.venueId) : undefined;

                        return (
                          <div key={i} className="flex gap-4 py-3">
                            <div className="w-20 shrink-0 pt-1 text-right">
                              <span className="text-xs font-mono text-brown font-medium">{item.time}</span>
                            </div>
                            <div className="flex-1">
                              <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono rounded-full border ${config.bg} ${config.border} ${config.text} mb-1`}>
                                {config.label}
                              </span>
                              <h4 className="font-mono text-lg text-brown mb-1">{item.name}</h4>
                              {item.address && <p className="text-[11px] font-mono text-muted mb-1">{item.address}</p>}
                              <p className="font-mono text-secondary text-sm leading-relaxed">{item.note}</p>
                              {venue?.google_maps_url && (
                                <a href={venue.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs font-mono text-gold hover:text-brown transition-colors">
                                  Open in Maps &rarr;
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Signoff */}
          <div className="mt-12 text-center">
            <p className="font-mono text-gold text-lg leading-relaxed max-w-md mx-auto">{itinerary.signoff}</p>
          </div>

          <p className="mt-16 text-center text-xs font-mono text-muted">
            Every recommendation personally tested & approved by Denna
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
