"use client";

import { useState, useEffect, useCallback } from "react";

interface ReviewVenue {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  neighborhood: string | null;
  denna_note: string | null;
  address: string | null;
  instagram: string | null;
  google_maps_url: string | null;
  needs_review: boolean;
  cities?: { city_name: string };
}

interface ReviewModeProps {
  city: string | null;
  onClose: () => void;
  onRefresh: () => void;
  adminFetch?: (url: string, init?: RequestInit) => Promise<Response>;
}

export default function ReviewMode({ city, onClose, onRefresh, adminFetch }: ReviewModeProps) {
  const fetchFn = adminFetch ?? fetch;
  const [venues, setVenues] = useState<ReviewVenue[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [note, setNote] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalReviewed, setTotalReviewed] = useState(0);

  const loadReviewQueue = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ needs_review: "true", sort: "name", limit: "500" });
    if (city) params.set("city", city);

    const res = await fetchFn(`/api/admin/venues?${params}`);
    const data = await res.json();
    setVenues(data.venues ?? []);
    setCurrentIndex(0);
    setLoading(false);
  }, [city]);

  useEffect(() => {
    loadReviewQueue();
  }, [loadReviewQueue]);

  const current = venues[currentIndex];

  useEffect(() => {
    if (current) {
      setNote(current.denna_note ?? "");
      setNeighborhood(current.neighborhood ?? "");
    }
  }, [current]);

  const saveAndNext = async () => {
    if (!current) return;
    await fetchFn(`/api/admin/venues/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        denna_note: note || null,
        neighborhood: neighborhood || null,
        needs_review: false,
      }),
    });
    setTotalReviewed((prev) => prev + 1);
    if (currentIndex < venues.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onRefresh();
      onClose();
    }
  };

  const skip = () => {
    if (currentIndex < venues.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const previous = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const deleteVenue = async () => {
    if (!current) return;
    await fetchFn(`/api/admin/venues/${current.id}`, { method: "DELETE" });
    const updated = venues.filter((_, i) => i !== currentIndex);
    setVenues(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-mono text-muted">Loading review queue...</p>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <h2 className="font-serif text-2xl text-brown">All caught up!</h2>
        <p className="font-mono text-sm text-secondary">No venues need review{city ? ` in ${city}` : ""}.</p>
        <button onClick={onClose} className="px-6 py-2 bg-brown text-cream font-mono text-sm rounded-full">Back to Admin</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => { onRefresh(); onClose(); }} className="font-mono text-sm text-secondary hover:text-brown">&larr; Back</button>
          <h2 className="font-serif text-xl text-brown">Review Mode</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-48 h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / venues.length) * 100}%` }}
            />
          </div>
          <span className="font-mono text-xs text-muted">
            {currentIndex + 1} of {venues.length} ({totalReviewed} reviewed)
          </span>
        </div>
      </div>

      {/* Main card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl p-8">
          {/* Venue info */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-serif text-2xl text-brown">{current.name}</h3>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-gold/10 border border-gold/30 text-gold">
                {current.category}
              </span>
            </div>
            <p className="font-mono text-xs text-muted">
              {current.cities?.city_name} {current.address ? `| ${current.address}` : ""}
            </p>
            <div className="flex gap-3 mt-2 text-xs font-mono">
              {current.google_maps_url && (
                <a href={current.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Google Maps</a>
              )}
              {current.instagram && (
                <a href={`https://instagram.com/${current.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Instagram</a>
              )}
            </div>
          </div>

          {/* Neighborhood */}
          <div className="mb-4">
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Neighborhood</label>
            <input
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Enter neighborhood..."
              className="w-full px-4 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold"
            />
          </div>

          {/* Denna's Note - the main field */}
          <div className="mb-6">
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Denna&apos;s Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={6}
              autoFocus
              placeholder="Write your note about this venue..."
              className="w-full px-4 py-3 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={previous}
              disabled={currentIndex === 0}
              className={`px-5 py-2.5 rounded-full text-sm font-mono border transition-colors ${
                currentIndex === 0 ? "border-border text-muted cursor-not-allowed" : "border-border text-secondary hover:border-gold"
              }`}
            >
              Previous
            </button>
            <button
              onClick={skip}
              className="px-5 py-2.5 rounded-full text-sm font-mono border border-border text-secondary hover:border-gold transition-colors"
            >
              Skip
            </button>
            <button
              onClick={deleteVenue}
              className="px-5 py-2.5 rounded-full text-sm font-mono border border-red-500/30 text-red-600 hover:bg-red-500/10 transition-colors"
            >
              Delete
            </button>
            <div className="flex-1" />
            <button
              onClick={saveAndNext}
              className="px-8 py-2.5 bg-brown text-cream rounded-full text-sm font-mono hover:bg-brown/90 transition-colors"
            >
              Save & Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
