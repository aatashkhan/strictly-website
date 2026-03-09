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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useUser();

  // Get venues for the selected city (needed for swap functionality)
  const cityVenues: Venue[] = useMemo(() => {
    if (!tripData?.city) return [];
    const cityData = getCityData(tripData.city);
    return cityData?.venues ?? [];
  }, [tripData?.city]);

  const handleFormSubmit = (data: TripFormData) => {
    setTripData(data);
    // Skip email gate if user is already signed in
    if (user) {
      const fullData = { ...data, email: user.email || "" };
      setTripData(fullData);
      setView("loading");
      generateItinerary(fullData);
    } else {
      setView("email");
    }
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
    if (user) {
      const fullData = { ...surpriseData, email: user.email || "" };
      setTripData(fullData);
      setView("loading");
      generateItinerary(fullData);
    } else {
      setTripData(surpriseData);
      setView("email");
    }
  };

  const generateItinerary = async (data: TripFormData) => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to generate itinerary");
      }

      const result = await response.json();
      setItinerary(result);
      setView("itinerary");

      // Send itinerary email if user provided an email
      if (data.email) {
        fetch("/api/send-itinerary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email, itinerary: result, tripData: data }),
        }).catch((err) => console.error("Failed to send itinerary email:", err));
      }
    } catch (error) {
      console.error("Generation error:", error);
      setItinerary(null);
      setView("itinerary");
    }
  };

  const handleEmailSubmit = async (email: string) => {
    if (!tripData) return;
    const fullData = { ...tripData, email };
    setTripData(fullData);
    setView("loading");
    generateItinerary(fullData);
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
            onSignIn={!user ? () => setShowAuthModal(true) : undefined}
            isSaved={!!savedTripId}
          />
        </section>
      )}

      {(view === "form" || view === "itinerary") && <Footer />}

      {/* Auth modal triggered from "Sign in to save" button */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    // Clear itinerary guard so OAuth redirect doesn't trigger "are you sure" prompt
    (window as unknown as Record<string, boolean>).__strictlyHasItinerary = false;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/concierge" },
    });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/concierge" },
    });
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-cream border border-border rounded-2xl p-8 max-w-sm w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl text-muted hover:text-brown"
        >
          &times;
        </button>

        <h2 className="font-mono text-2xl font-bold text-brown mb-2">Save your trip</h2>
        <p className="font-mono text-sm text-secondary mb-6">
          Sign in to save this itinerary and access it anytime from My Trips.
        </p>

        <button
          onClick={handleGoogle}
          className="w-full px-4 py-3 rounded-xl border border-border font-mono text-sm text-brown hover:border-gold hover:bg-surface transition-all mb-4 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs font-mono text-muted">or</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {sent ? (
          <p className="font-mono text-sm text-gold text-center py-4">
            Check your email for the magic link!
          </p>
        ) : (
          <form onSubmit={handleMagicLink}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-border bg-transparent font-mono text-sm text-brown placeholder:text-muted focus:outline-none focus:border-gold mb-3"
            />
            {error && <p className="text-xs font-mono text-red-500 mb-2">{error}</p>}
            <button
              type="submit"
              className="w-full px-4 py-3 rounded-xl bg-gold text-white font-mono text-sm hover:bg-gold/90 transition-colors"
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </div>
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
