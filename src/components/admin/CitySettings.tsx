"use client";

import { useState, useEffect } from "react";

interface CityData {
  id: string;
  city_name: string;
  country: string;
  region: string | null;
  denna_intro: string | null;
  recommended_transit: string[] | null;
  loading_tips: string[] | null;
  custom_vibes: string[] | null;
  image_url: string | null;
}

const TRANSIT_OPTIONS = ["rideshare", "public_transit", "walking_preferred", "rental_car"];

export default function CitySettings({ cityId, adminFetch }: { cityId: string; adminFetch?: (url: string, init?: RequestInit) => Promise<Response> }) {
  const fetchFn = adminFetch ?? fetch;
  const [city, setCity] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // List editors
  const [newTip, setNewTip] = useState("");
  const [newVibe, setNewVibe] = useState("");

  useEffect(() => {
    fetchFn(`/api/admin/cities/${cityId}`)
      .then((r) => r.json())
      .then((data) => { setCity(data.city); setLoading(false); })
      .catch(() => setLoading(false));
  }, [cityId]);

  if (loading || !city) {
    return <div className="flex items-center justify-center py-20"><p className="font-mono text-sm text-muted">Loading...</p></div>;
  }

  const save = async (updates: Partial<CityData>) => {
    const res = await fetchFn(`/api/admin/cities/${cityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const { city: updated } = await res.json();
      setCity(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const toggleTransit = (mode: string) => {
    const current = city.recommended_transit ?? [];
    const updated = current.includes(mode)
      ? current.filter((t) => t !== mode)
      : [...current, mode];
    save({ recommended_transit: updated });
  };

  const addTip = () => {
    if (!newTip.trim()) return;
    const updated = [...(city.loading_tips ?? []), newTip.trim()];
    save({ loading_tips: updated });
    setNewTip("");
  };

  const removeTip = (index: number) => {
    const updated = (city.loading_tips ?? []).filter((_, i) => i !== index);
    save({ loading_tips: updated });
  };

  const addVibe = () => {
    if (!newVibe.trim()) return;
    const updated = [...(city.custom_vibes ?? []), newVibe.trim()];
    save({ custom_vibes: updated });
    setNewVibe("");
  };

  const removeVibe = (index: number) => {
    const updated = (city.custom_vibes ?? []).filter((_, i) => i !== index);
    save({ custom_vibes: updated });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif text-lg text-brown">City Settings</h3>
        {saved && <span className="text-xs font-mono text-green-600">Saved</span>}
      </div>

      <div className="space-y-6">
        {/* Basic info */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">City Name</label>
            <input
              value={city.city_name}
              onBlur={(e) => save({ city_name: e.target.value })}
              onChange={(e) => setCity({ ...city, city_name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Country</label>
            <input
              value={city.country}
              onBlur={(e) => save({ country: e.target.value })}
              onChange={(e) => setCity({ ...city, country: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Region</label>
            <input
              value={city.region ?? ""}
              onBlur={(e) => save({ region: e.target.value || null })}
              onChange={(e) => setCity({ ...city, region: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        {/* Denna's Intro */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Denna&apos;s Intro</label>
          <textarea
            value={city.denna_intro ?? ""}
            onBlur={(e) => save({ denna_intro: e.target.value || null })}
            onChange={(e) => setCity({ ...city, denna_intro: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold resize-y"
          />
        </div>

        {/* Recommended Transit */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-2">Recommended Transit</label>
          <div className="flex flex-wrap gap-2">
            {TRANSIT_OPTIONS.map((mode) => {
              const active = (city.recommended_transit ?? []).includes(mode);
              return (
                <button
                  key={mode}
                  onClick={() => toggleTransit(mode)}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono border transition-colors ${
                    active ? "bg-brown text-cream border-brown" : "border-border text-secondary hover:border-gold"
                  }`}
                >
                  {mode.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Tips */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-2">Loading Tips</label>
          <div className="space-y-1 mb-2">
            {(city.loading_tips ?? []).map((tip, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-lg">
                <span className="flex-1 text-xs font-mono text-brown">{tip}</span>
                <button onClick={() => removeTip(i)} className="text-muted hover:text-red-500 text-sm">&times;</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newTip}
              onChange={(e) => setNewTip(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTip()}
              placeholder="Add a tip..."
              className="flex-1 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-brown bg-cream placeholder:text-muted focus:outline-none focus:border-gold"
            />
            <button onClick={addTip} className="px-3 py-1.5 bg-gold text-white text-xs font-mono rounded-lg">Add</button>
          </div>
        </div>

        {/* Custom Vibes */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-2">Custom Vibes</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(city.custom_vibes ?? []).map((vibe, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-surface rounded-full text-xs font-mono text-brown">
                {vibe}
                <button onClick={() => removeVibe(i)} className="text-muted hover:text-red-500">&times;</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newVibe}
              onChange={(e) => setNewVibe(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addVibe()}
              placeholder="Add a vibe..."
              className="flex-1 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-brown bg-cream placeholder:text-muted focus:outline-none focus:border-gold"
            />
            <button onClick={addVibe} className="px-3 py-1.5 bg-gold text-white text-xs font-mono rounded-lg">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
