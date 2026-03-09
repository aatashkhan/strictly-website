"use client";

import { Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import TripForm from "@/components/TripForm";
import LoadingScreen from "@/components/LoadingScreen";
import ItineraryDisplay from "@/components/ItineraryDisplay";
import EmailGate from "@/components/EmailGate";
import { TripFormData, ItineraryData, Venue } from "@/lib/types";
import { getCityData } from "@/lib/venues";
import { FEATURED_CITIES } from "@/lib/constants";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type View = "form" | "email" | "loading" | "itinerary";

function ConciergeContent() {
  const searchParams = useSearchParams();
  const initialCity = searchParams.get("city") || undefined;

  const [view, setView] = useState<View>("form");
  const [tripData, setTripData] = useState<TripFormData | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const { user } = useUser();

  // Get venues for the selected city (needed for swap functionality)
  const cityVenues: Venue[] = useMemo(() => {
    if (!tripData?.city) return [];
    const cityData = getCityData(tripData.city);
    return cityData?.venues ?? [];
  }, [tripData?.city]);

  const handleFormSubmit = (data: TripFormData) => {
    setTripData(data);
    setView("email");
  };

  // QoL 3: Surprise Me — pick a random featured city with sensible defaults
  const handleSurpriseMe = () => {
    const available = FEATURED_CITIES.filter((c) => getCityData(c) !== null);
    const randomCity = available[Math.floor(Math.random() * available.length)];
    const surpriseData: TripFormData = {
      city: randomCity,
      duration: "3",
      companions: "Solo",
      vibes: ["Foodie", "Culture"],
      budget: "Treat yourself",
      pace: "balanced",
      notes: "",
      email: "",
      arrival: null,
      departure: null,
      hotel: null,
    };
    setTripData(surpriseData);
    setView("email");
  };

  const handleEmailSubmit = async (email: string) => {
    if (!tripData) return;
    const fullData = { ...tripData, email };
    setTripData(fullData);
    setView("loading");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate itinerary");
      }

      const result = await response.json();
      setItinerary(result);
      setView("itinerary");

      // Send itinerary email if user provided an email
      if (email) {
        fetch("/api/send-itinerary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, itinerary: result, tripData: fullData }),
        }).catch((err) => console.error("Failed to send itinerary email:", err));
      }
    } catch (error) {
      console.error("Generation error:", error);
      setItinerary(null);
      setView("itinerary");
    }
  };

  const handleSaveTrip = async (currentItinerary?: ItineraryData) => {
    if (!tripData) return null;
    const itineraryToSave = currentItinerary || itinerary;
    if (!itineraryToSave) return null;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    try {
      if (savedTripId) {
        // Update existing
        const res = await fetch(`/api/trips/${savedTripId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ itinerary: itineraryToSave }),
        });
        if (res.ok) return savedTripId;
      } else {
        // Create new
        const res = await fetch("/api/trips", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            city: tripData.city,
            trip_data: tripData,
            itinerary: itineraryToSave,
            starts_on: tripData.arrival?.date || null,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSavedTripId(data.id);
          return data.id;
        }
      }
    } catch (err) {
      console.error("Failed to save trip:", err);
    }
    return null;
  };

  // Warn before losing itinerary (browser refresh/close) + set global flag for Nav
  const hasActiveItinerary = view === "itinerary" && itinerary !== null;

  useEffect(() => {
    // Expose flag on window for Nav to check
    (window as unknown as Record<string, boolean>).__strictlyHasItinerary = hasActiveItinerary;
    return () => {
      (window as unknown as Record<string, boolean>).__strictlyHasItinerary = false;
    };
  }, [hasActiveItinerary]);

  useEffect(() => {
    if (hasActiveItinerary) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [hasActiveItinerary]);

  const confirmLeave = useCallback(() => {
    if (view === "itinerary" && itinerary) {
      return window.confirm("Are you sure you want to leave? Your itinerary will be lost.");
    }
    return true;
  }, [view, itinerary]);

  const handleBack = () => {
    if (!confirmLeave()) return;
    setView("form");
    setItinerary(null);
    setTripData(null);
  };

  const handleEdit = () => {
    if (!confirmLeave()) return;
    setView("form");
    setItinerary(null);
    // keep tripData so the form can pre-fill
  };

  return (
    <>
      {view === "form" && (
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-sm uppercase tracking-[4px] text-gold mb-4 font-mono">
                Strictly Concierge
              </p>
              <h1 className="font-mono text-4xl md:text-5xl font-bold text-brown mb-4 leading-tight">
                Your trip, <span className="italic">strictly</span> curated.
              </h1>
              <p className="font-mono text-secondary max-w-md mx-auto">
                Tell me where you&apos;re going and how you like to travel.
                I&apos;ll build your perfect itinerary from my personally vetted
                city guides.
              </p>
            </div>
            <TripForm onSubmit={handleFormSubmit} initialCity={initialCity} initialData={tripData} />
            <div className="text-center mt-6">
              <button
                onClick={handleSurpriseMe}
                className="text-sm font-mono text-muted hover:text-gold transition-colors"
              >
                Or just surprise me &rarr;
              </button>
            </div>
          </div>
        </section>
      )}

      {view === "email" && (
        <EmailGate
          isOpen={true}
          onSubmit={handleEmailSubmit}
          onSkip={() => handleEmailSubmit("")}
          onClose={() => setView("form")}
        />
      )}

      {view === "loading" && <LoadingScreen city={tripData?.city} />}

      {view === "itinerary" && tripData && (
        <section className="pt-32 pb-20">
          <ItineraryDisplay
            data={itinerary}
            tripData={tripData}
            venues={cityVenues}
            onBack={handleBack}
            onEdit={handleEdit}
            onSave={user ? handleSaveTrip : undefined}
            isSaved={!!savedTripId}
          />
        </section>
      )}

      {(view === "form" || view === "itinerary") && <Footer />}
    </>
  );
}

export default function ConciergePage() {
  return (
    <main>
      <Nav />
      <Suspense fallback={<LoadingScreen />}>
        <ConciergeContent />
      </Suspense>
    </main>
  );
}
