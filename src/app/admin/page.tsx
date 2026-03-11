"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin, useAdminFetch } from "./AdminContext";
import { supabase } from "@/lib/supabase";
import { CATEGORY_CONFIG } from "@/lib/constants";
import AdminChat from "@/components/admin/AdminChat";
import VenueEditor from "@/components/admin/VenueEditor";
import CitySettings from "@/components/admin/CitySettings";
import ReviewMode from "@/components/admin/ReviewMode";
import ConfirmModal from "@/components/ConfirmModal";

interface CityInfo {
  id: string;
  city_name: string;
  country: string;
  venue_count: number;
  needs_review_count: number;
}

interface VenueRow {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  neighborhood: string | null;
  denna_note: string | null;
  price_indicator: string | null;
  status: string;
  access: string;
  needs_review: boolean;
  address: string | null;
  image_url: string | null;
  display_order: number | null;
  updated_at: string;
  google_maps_url?: string | null;
  instagram?: string | null;
  website?: string | null;
  city_id?: string;
  cities?: { city_name: string; country: string };
  [key: string]: unknown;
}

type Tab = "venues" | "settings";
type SortOption = "needs_review_first" | "name" | "category" | "neighborhood" | "display_order" | "updated";

export default function AdminPage() {
  const { user } = useAdmin();
  const adminFetch = useAdminFetch();
  const [cities, setCities] = useState<CityInfo[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState("");
  const [tab, setTab] = useState<Tab>("venues");
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [venueTotal, setVenueTotal] = useState(0);
  const [venueLoading, setVenueLoading] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueRow | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VenueRow | null>(null);
  const [deleteCityTarget, setDeleteCityTarget] = useState<CityInfo | null>(null);

  // Add city modal
  const [showAddCity, setShowAddCity] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [newCityCountry, setNewCityCountry] = useState("");
  const [newCityRegion, setNewCityRegion] = useState("");

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMissing, setFilterMissing] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("needs_review_first");

  // Load cities
  const loadCities = useCallback(async () => {
    try {
      const r = await adminFetch("/api/admin/cities");
      const data = await r.json();
      setCities(data.cities ?? []);
    } catch (e) {
      console.error("Failed to load cities:", e);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  // Load venues when city or filters change
  const loadVenues = useCallback(async () => {
    setVenueLoading(true);
    const params = new URLSearchParams();
    if (selectedCity) params.set("city", selectedCity);
    if (filterCategory) params.set("category", filterCategory);
    if (filterStatus) params.set("status", filterStatus);
    if (filterMissing) params.set("missing_field", filterMissing);
    if (filterSearch) params.set("search", filterSearch);
    params.set("sort", sort);
    params.set("limit", "200");

    try {
      const res = await adminFetch(`/api/admin/venues?${params}`);
      const data = await res.json();
      setVenues(data.venues ?? []);
      setVenueTotal(data.total ?? 0);
    } catch (e) {
      console.error("Failed to load venues:", e);
    } finally {
      setVenueLoading(false);
    }
  }, [selectedCity, filterCategory, filterStatus, filterMissing, filterSearch, sort, adminFetch]);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const handleSaveVenue = async (id: string, updates: Record<string, unknown>) => {
    const res = await adminFetch(`/api/admin/venues/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const { venue } = await res.json();
      // If city_id changed, the venue may no longer belong to the selected city filter
      if (updates.city_id && updates.city_id !== editingVenue?.city_id) {
        // Reload venues and city counts
        loadVenues();
        loadCities();
        setEditingVenue(null);
      } else {
        setVenues((prev) => prev.map((v) => (v.id === id ? { ...v, ...venue } : v)));
        if (editingVenue?.id === id) {
          setEditingVenue((prev) => prev ? { ...prev, ...venue } : null);
        }
      }
    }
  };

  const handleAddVenue = async () => {
    if (!selectedCity) return;
    const res = await adminFetch("/api/admin/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city_name: selectedCity,
        name: "New Venue",
        category: "eat",
        needs_review: true,
      }),
    });
    if (res.ok) {
      const { venue } = await res.json();
      setVenues((prev) => [venue, ...prev]);
      setEditingVenue(venue);
    }
  };

  const handleDeleteVenue = async (venue: VenueRow) => {
    const res = await adminFetch(`/api/admin/venues/${venue.id}`, { method: "DELETE" });
    if (res.ok) {
      setVenues((prev) => prev.filter((v) => v.id !== venue.id));
      if (editingVenue?.id === venue.id) setEditingVenue(null);
      setDeleteTarget(null);
    }
  };

  const handleAddCity = async () => {
    if (!newCityName.trim() || !newCityCountry.trim()) return;
    const res = await adminFetch("/api/admin/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city_name: newCityName.trim(),
        country: newCityCountry.trim(),
        region: newCityRegion.trim() || null,
      }),
    });
    if (res.ok) {
      const { city } = await res.json();
      setCities((prev) => [...prev, { ...city, venue_count: 0, needs_review_count: 0 }].sort((a, b) => a.city_name.localeCompare(b.city_name)));
      setSelectedCity(city.city_name);
      setShowAddCity(false);
      setNewCityName("");
      setNewCityCountry("");
      setNewCityRegion("");
    }
  };

  const handleDeleteCity = async (city: CityInfo) => {
    const res = await adminFetch(`/api/admin/cities/${city.id}`, { method: "DELETE" });
    if (res.ok) {
      setCities((prev) => prev.filter((c) => c.id !== city.id));
      if (selectedCity === city.city_name) {
        setSelectedCity(null);
        setEditingVenue(null);
      }
      setDeleteCityTarget(null);
    }
  };

  const filteredCities = cities.filter((c) =>
    c.city_name.toLowerCase().includes(citySearch.toLowerCase())
  );

  const selectedCityData = cities.find((c) => c.city_name === selectedCity);

  // Build city options for the VenueEditor reassignment dropdown
  const cityOptions = cities.map((c) => ({ id: c.id, city_name: c.city_name }));

  if (reviewMode) {
    return (
      <ReviewMode
        city={selectedCity}
        onClose={() => setReviewMode(false)}
        onRefresh={loadVenues}
        adminFetch={adminFetch}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Sidebar */}
      <aside className="w-64 h-screen sticky top-0 border-r border-border bg-surface flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-border">
          <h1 className="font-serif text-xl text-brown">Admin</h1>
          <p className="font-mono text-[10px] text-muted mt-1">{user?.email}</p>
        </div>

        <div className="px-3 py-3 space-y-2">
          <input
            type="text"
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            placeholder="Filter cities..."
            className="w-full px-3 py-2 bg-cream border border-border rounded-lg text-xs font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold"
          />
          <button
            onClick={() => setShowAddCity(true)}
            className="w-full px-3 py-1.5 border border-dashed border-gold/40 text-gold text-xs font-mono rounded-lg hover:bg-gold/5 transition-colors"
          >
            + Add City
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => setSelectedCity(null)}
            className={`w-full text-left px-4 py-2.5 text-xs font-mono transition-colors ${
              !selectedCity ? "bg-gold/10 text-gold" : "text-secondary hover:bg-cream"
            }`}
          >
            All Cities
          </button>
          {filteredCities.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCity(c.city_name)}
              className={`w-full text-left px-4 py-2.5 text-xs font-mono transition-colors flex items-center justify-between group ${
                selectedCity === c.city_name ? "bg-gold/10 text-gold" : "text-secondary hover:bg-cream"
              }`}
            >
              <span className="truncate">{c.city_name}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="text-muted">{c.venue_count}</span>
                {c.needs_review_count > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500" title={`${c.needs_review_count} need review`} />
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-border space-y-2">
          <a
            href="/admin/content"
            className="block w-full px-3 py-2 bg-brown/5 border border-brown/20 text-brown rounded-lg text-xs font-mono hover:bg-brown/10 transition-colors text-center"
          >
            Site Content
          </a>
          <button
            onClick={() => setReviewMode(true)}
            className="w-full px-3 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-xs font-mono hover:bg-gold/20 transition-colors"
          >
            Review Mode
          </button>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono text-secondary hover:border-gold transition-colors"
          >
            AI Assistant
          </button>
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
            className="w-full px-3 py-2 text-xs font-mono text-muted hover:text-brown transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl text-brown">
              {selectedCity ?? "All Cities"}
            </h2>
            <p className="font-mono text-xs text-muted mt-1">
              {venueTotal} venues{selectedCityData?.needs_review_count ? ` (${selectedCityData.needs_review_count} need review)` : ""}
            </p>
          </div>

          {selectedCity && (
            <div className="flex items-center gap-3">
              <div className="flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setTab("venues")}
                  className={`px-4 py-2 text-xs font-mono ${
                    tab === "venues" ? "bg-brown text-cream" : "text-secondary hover:bg-cream"
                  }`}
                >
                  Venues
                </button>
                <button
                  onClick={() => setTab("settings")}
                  className={`px-4 py-2 text-xs font-mono ${
                    tab === "settings" ? "bg-brown text-cream" : "text-secondary hover:bg-cream"
                  }`}
                >
                  City Settings
                </button>
              </div>
              {tab === "venues" && (
                <button
                  onClick={handleAddVenue}
                  className="px-4 py-2 bg-gold text-white text-xs font-mono rounded-lg hover:bg-gold/90 transition-colors"
                >
                  + Add Venue
                </button>
              )}
              {selectedCityData && (
                <button
                  onClick={() => setDeleteCityTarget(selectedCityData)}
                  className="px-3 py-2 border border-red-500/30 text-red-500 text-xs font-mono rounded-lg hover:bg-red-500/10 transition-colors"
                  title="Delete this city"
                >
                  Delete City
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filters bar (venues tab only) */}
        {tab === "venues" && (
          <div className="px-6 py-3 border-b border-border flex flex-wrap items-center gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg text-xs font-mono bg-cream text-brown"
            >
              <option value="">All Categories</option>
              {Object.keys(CATEGORY_CONFIG).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg text-xs font-mono bg-cream text-brown"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="needs_review">Needs Review</option>
            </select>
            <select
              value={filterMissing}
              onChange={(e) => setFilterMissing(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg text-xs font-mono bg-cream text-brown"
            >
              <option value="">All Data</option>
              <option value="denna_note">Missing Note</option>
              <option value="neighborhood">Missing Neighborhood</option>
              <option value="address">Missing Address</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="px-3 py-1.5 border border-border rounded-lg text-xs font-mono bg-cream text-brown"
            >
              <option value="needs_review_first">Needs Review First</option>
              <option value="name">Name (A-Z)</option>
              <option value="category">Category</option>
              <option value="neighborhood">Neighborhood</option>
              <option value="display_order">Display Order</option>
              <option value="updated">Recently Updated</option>
            </select>
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search..."
              className="px-3 py-1.5 border border-border rounded-lg text-xs font-mono bg-cream text-brown placeholder:text-muted flex-1 min-w-[150px]"
            />
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {tab === "settings" && selectedCity && selectedCityData ? (
            <CitySettings cityId={selectedCityData.id} adminFetch={adminFetch} />
          ) : (
            <>
              {/* Venue list */}
              <div className={`${editingVenue ? "w-1/2" : "flex-1"} overflow-y-auto`}>
                {venueLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <p className="font-mono text-sm text-muted">Loading...</p>
                  </div>
                ) : venues.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <p className="font-mono text-sm text-muted">No venues found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {venues.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setEditingVenue(v)}
                        className={`w-full text-left px-6 py-3 hover:bg-cream/50 transition-colors flex items-center gap-4 ${
                          editingVenue?.id === v.id ? "bg-gold/5" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-brown font-medium truncate">{v.name}</span>
                            {v.needs_review && (
                              <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-mono bg-red-500/10 text-red-600 rounded-full">review</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="px-2 py-0.5 text-[10px] font-mono rounded-full border"
                              style={{
                                backgroundColor: `var(--color-${v.category}, #ddd)20`,
                                borderColor: `var(--color-${v.category}, #ddd)40`,
                                color: `var(--color-${v.category}, #666)`,
                              }}
                            >
                              {v.category}
                            </span>
                            {v.neighborhood && (
                              <span className="text-[10px] font-mono text-muted truncate">{v.neighborhood}</span>
                            )}
                          </div>
                        </div>
                        {v.denna_note ? (
                          <p className="text-[10px] font-mono text-muted max-w-[200px] line-clamp-2 shrink-0">{v.denna_note}</p>
                        ) : (
                          <span className="text-[10px] font-mono text-red-400 shrink-0">no note</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Venue editor panel */}
              {editingVenue && (
                <div className="w-1/2 border-l border-border overflow-y-auto">
                  <VenueEditor
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    venue={editingVenue as any}
                    cities={cityOptions}
                    onSave={(updates) => handleSaveVenue(editingVenue.id, updates)}
                    onDelete={() => setDeleteTarget(editingVenue)}
                    onClose={() => setEditingVenue(null)}
                    adminFetch={adminFetch}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Admin AI Chat */}
      {chatOpen && (
        <AdminChat
          onClose={() => setChatOpen(false)}
          onRefresh={loadVenues}
          adminFetch={adminFetch}
        />
      )}

      {/* Delete venue confirmation */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete venue?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDeleteVenue(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Delete city confirmation */}
      <ConfirmModal
        isOpen={deleteCityTarget !== null}
        title="Delete city?"
        message={`Are you sure you want to delete "${deleteCityTarget?.city_name}" and all ${deleteCityTarget?.venue_count ?? 0} venues in it? This cannot be undone.`}
        confirmLabel="Delete City"
        onConfirm={() => deleteCityTarget && handleDeleteCity(deleteCityTarget)}
        onCancel={() => setDeleteCityTarget(null)}
      />

      {/* Add city modal */}
      {showAddCity && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md shadow-lg border border-border">
            <h3 className="font-serif text-lg text-brown mb-4">Add New City</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">City Name *</label>
                <input
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="e.g. Berlin"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Country *</label>
                <input
                  value={newCityCountry}
                  onChange={(e) => setNewCityCountry(e.target.value)}
                  placeholder="e.g. Germany"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Region</label>
                <input
                  value={newCityRegion}
                  onChange={(e) => setNewCityRegion(e.target.value)}
                  placeholder="e.g. Europe"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddCity}
                disabled={!newCityName.trim() || !newCityCountry.trim()}
                className="flex-1 px-4 py-2 bg-gold text-white text-xs font-mono rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-40"
              >
                Create City
              </button>
              <button
                onClick={() => { setShowAddCity(false); setNewCityName(""); setNewCityCountry(""); setNewCityRegion(""); }}
                className="px-4 py-2 border border-border text-secondary text-xs font-mono rounded-lg hover:bg-cream transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
