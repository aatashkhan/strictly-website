"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import TodayTimeline from "@/components/TodayTimeline";
import ReminderToast from "@/components/ReminderToast";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { scheduleReminders, clearReminders } from "@/lib/notifications";
import type { TripFormData, ItineraryData, ItineraryItem, Venue } from "@/lib/types";

interface CheckIn {
  id: string;
  venue_id: string;
  day_index: number;
  item_index: number;
}

export default function TodayPage() {
  const params = useParams();
  const { user, loading: authLoading } = useUser();
  const [trip, setTrip] = useState<{
    id: string;
    city: string;
    trip_data: TripFormData;
    itinerary: ItineraryData;
    starts_on: string | null;
  } | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [remindersOn, setRemindersOn] = useState(false);
  const [activeReminder, setActiveReminder] = useState<{ item: ItineraryItem; minutes: number } | null>(null);

  const fetchTrip = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const [tripRes, checkinsRes] = await Promise.all([
        fetch(`/api/trips/${params.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`/api/checkins?trip_id=${params.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      if (tripRes.ok) setTrip(await tripRes.json());
      if (checkinsRes.ok) setCheckins(await checkinsRes.json());
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (user) fetchTrip();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, fetchTrip]);

  const [cityVenues, setCityVenues] = useState<Venue[]>([]);

  useEffect(() => {
    if (!trip?.city) return;
    fetch(`/api/venues/${encodeURIComponent(trip.city)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setCityVenues(data?.venues ?? []))
      .catch(() => setCityVenues([]));
  }, [trip?.city]);

  // Determine which day "today" is
  const todayInfo = useMemo(() => {
    if (!trip?.starts_on || !trip.itinerary) return null;

    const start = new Date(trip.starts_on + "T00:00:00");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const dayIndex = diffDays; // 0-based
    const dayNumber = diffDays + 1; // 1-based

    if (dayIndex < 0) return { status: "not_started" as const, daysUntil: -diffDays };
    if (dayIndex >= trip.itinerary.days.length) return { status: "over" as const };

    const day = trip.itinerary.days.find((d) => d.day === dayNumber);
    if (!day) return { status: "over" as const };

    return { status: "active" as const, day, dayIndex };
  }, [trip]);

  const handleCheckIn = async (itemIndex: number, venueId?: string) => {
    if (!trip) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const dayIndex = todayInfo?.status === "active" ? todayInfo.dayIndex : 0;

    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          trip_id: trip.id,
          venue_id: venueId || null,
          day_index: dayIndex,
          item_index: itemIndex,
        }),
      });
      if (res.ok) {
        const newCheckin = await res.json();
        setCheckins((prev) => [...prev, newCheckin]);
      }
    } catch (err) {
      console.error("Check-in failed:", err);
    }
  };

  // Schedule reminders when toggled on
  useEffect(() => {
    if (!remindersOn || todayInfo?.status !== "active" || !todayInfo.day) {
      clearReminders();
      return;
    }

    scheduleReminders(todayInfo.day.items, (item, minutes) => {
      setActiveReminder({ item, minutes });
    });

    return () => clearReminders();
  }, [remindersOn, todayInfo]);

  if (loading || authLoading) {
    return (
      <main>
        <Nav />
        <div className="pt-32 pb-20 text-center">
          <p className="font-mono text-muted text-sm">Loading...</p>
        </div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main>
        <Nav />
        <div className="pt-32 pb-20 text-center px-6">
          <h2 className="font-mono text-2xl font-bold text-brown mb-4">Trip not found</h2>
          <Link href="/trips" className="px-6 py-3 bg-gold text-white font-mono text-sm rounded-full">
            Back to My Trips
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Nav />
      <section className="pt-28 pb-20 px-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/trips/${trip.id}`}
            className="text-sm font-mono text-secondary hover:text-brown transition-colors"
          >
            &larr; Full Itinerary
          </Link>
          <span className="text-xs font-mono text-muted">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>

        <h1 className="font-mono text-3xl font-bold text-brown mb-6">
          Today in {trip.city}
        </h1>

        {todayInfo?.status === "not_started" && (
          <div className="text-center py-16">
            <p className="font-mono text-2xl font-bold text-brown mb-2">Not quite yet!</p>
            <p className="font-mono text-secondary">
              Your trip starts in {todayInfo.daysUntil} day{todayInfo.daysUntil === 1 ? "" : "s"}.
            </p>
          </div>
        )}

        {todayInfo?.status === "over" && (
          <div className="text-center py-16">
            <p className="font-mono text-2xl font-bold text-gold mb-2">Trip complete!</p>
            <p className="font-mono text-secondary">
              Hope it was strictly the good stuff.
            </p>
          </div>
        )}

        {todayInfo?.status === "active" && todayInfo.day && (
          <>
            <p className="font-mono text-gold text-sm uppercase tracking-widest mb-4">
              Day {todayInfo.day.day} — {todayInfo.day.title}
            </p>
            {/* Reminder toggle */}
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs font-mono text-muted">Remind me before each stop</span>
              <button
                onClick={() => setRemindersOn(!remindersOn)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  remindersOn ? "bg-gold" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    remindersOn ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <TodayTimeline
              day={todayInfo.day}
              dayIndex={todayInfo.dayIndex}
              venues={cityVenues}
              checkins={checkins}
              onCheckIn={handleCheckIn}
            />
          </>
        )}
      </section>

      {/* Reminder toast */}
      {activeReminder && (
        <ReminderToast
          item={activeReminder.item}
          minutesUntil={activeReminder.minutes}
          onDismiss={() => setActiveReminder(null)}
        />
      )}
    </main>
  );
}
