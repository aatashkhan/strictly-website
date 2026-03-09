"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import TripCard from "@/components/TripCard";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { TripFormData } from "@/lib/types";

interface TripSummary {
  id: string;
  city: string;
  trip_data: TripFormData;
  status: string;
  created_at: string;
  updated_at: string;
  starts_on: string | null;
  share_token: string;
}

export default function TripsPage() {
  const { user, loading: authLoading } = useUser();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch("/api/trips", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTrips(data);
      }
    } catch (err) {
      console.error("Failed to fetch trips:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchTrips();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, fetchTrips]);

  const handleDelete = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setTrips((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete trip:", err);
    }
  };

  return (
    <main>
      <Nav />
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[4px] text-gold mb-4 font-mono">
              My Trips
            </p>
            <h1 className="font-mono text-4xl md:text-5xl font-bold text-brown mb-4 leading-tight">
              Your saved itineraries
            </h1>
          </div>

          {loading || authLoading ? (
            <div className="text-center py-16">
              <p className="font-mono text-muted text-sm">Loading your trips...</p>
            </div>
          ) : !user ? (
            <div className="text-center py-16">
              <p className="font-mono text-secondary mb-4">Sign in to see your saved trips.</p>
              <Link
                href="/concierge"
                className="px-6 py-3 bg-gold text-white font-mono text-sm rounded-full hover:bg-gold/90 transition-colors"
              >
                Go to Concierge
              </Link>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-mono text-secondary text-lg mb-2">No trips yet</p>
              <p className="font-mono text-muted text-sm mb-6">
                Plan your first one and save it here.
              </p>
              <Link
                href="/concierge"
                className="px-6 py-3 bg-gold text-white font-mono text-sm rounded-full hover:bg-gold/90 transition-colors"
              >
                Plan a Trip
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  id={trip.id}
                  city={trip.city}
                  tripData={trip.trip_data}
                  status={trip.status}
                  createdAt={trip.created_at}
                  startsOn={trip.starts_on}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
