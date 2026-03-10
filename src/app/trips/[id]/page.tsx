"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ItineraryDisplay from "@/components/ItineraryDisplay";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { TripFormData, ItineraryData, Venue } from "@/lib/types";

function ShareButton({ tripId }: { tripId: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/trips/${tripId}/share`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { shareUrl } = await res.json();
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`px-4 py-1.5 rounded-full text-sm font-mono transition-all border ${
        copied
          ? "border-green-600/30 text-green-700 bg-green-600/10"
          : "border-border text-secondary hover:border-gold hover:text-gold"
      }`}
    >
      {copied ? "Link copied!" : "Share"}
    </button>
  );
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const [trip, setTrip] = useState<{
    id: string;
    city: string;
    trip_data: TripFormData;
    itinerary: ItineraryData;
    original: ItineraryData;
    status: string;
    starts_on: string | null;
    share_token: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTrip = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/trips/${params.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setTrip(await res.json());
      } else {
        setError("Trip not found");
      }
    } catch {
      setError("Failed to load trip");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (user) fetchTrip();
    else if (!authLoading) {
      setError("Please sign in");
      setLoading(false);
    }
  }, [user, authLoading, fetchTrip]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const [cityVenues, setCityVenues] = useState<Venue[]>([]);

  useEffect(() => {
    if (!trip?.city) return;
    fetch(`/api/venues/${encodeURIComponent(trip.city)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setCityVenues(data?.venues ?? []))
      .catch(() => setCityVenues([]));
  }, [trip?.city]);

  // Debounced auto-save
  const handleSave = useCallback(async (currentItinerary?: ItineraryData) => {
    if (!trip) return null;
    const itineraryToSave = currentItinerary || trip.itinerary;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Clear any pending debounce
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ itinerary: itineraryToSave }),
      });
      if (res.ok) return trip.id;
    } catch (err) {
      console.error("Failed to save trip:", err);
    }
    return null;
  }, [trip]);

  if (loading || authLoading) {
    return (
      <main>
        <Nav />
        <div className="pt-32 pb-20 text-center">
          <p className="font-mono text-muted text-sm">Loading trip...</p>
        </div>
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main>
        <Nav />
        <div className="pt-32 pb-20 text-center px-6">
          <h2 className="font-mono text-2xl font-bold text-brown mb-4">{error || "Trip not found"}</h2>
          <Link
            href="/trips"
            className="px-6 py-3 bg-gold text-white font-mono text-sm rounded-full hover:bg-gold/90 transition-colors"
          >
            Back to My Trips
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Nav />
      <section className="pt-32 pb-20">
        <div className="max-w-2xl mx-auto px-6 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/trips"
              className="text-sm font-mono text-secondary hover:text-brown transition-colors"
            >
              &larr; My Trips
            </Link>
            {trip.starts_on && (
              <Link
                href={`/trips/${trip.id}/today`}
                className="px-4 py-1.5 rounded-full bg-gold text-white text-sm font-mono hover:bg-gold/90 transition-colors"
              >
                Today View
              </Link>
            )}
            <ShareButton tripId={trip.id} />
          </div>
        </div>
        <ItineraryDisplay
          data={trip.itinerary}
          tripData={trip.trip_data}
          venues={cityVenues}
          onBack={() => router.push("/trips")}
          onSave={handleSave}
          isSaved={true}
        />
      </section>
      <Footer />
    </main>
  );
}
