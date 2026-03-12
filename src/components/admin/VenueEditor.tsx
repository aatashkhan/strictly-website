"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface VenueEditorRow {
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
  google_maps_url?: string | null;
  instagram?: string | null;
  website?: string | null;
  city_id?: string;
  [key: string]: unknown;
}

interface CityOption {
  id: string;
  city_name: string;
}

interface VenueEditorProps {
  venue: VenueEditorRow;
  cities?: CityOption[];
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onDelete: () => void;
  onClose: () => void;
  adminFetch?: (url: string, init?: RequestInit) => Promise<Response>;
}

const CATEGORIES = ["eat", "drink", "stay", "explore", "shop", "spa"];
const PRICE_OPTIONS = ["", "$", "$$", "$$$", "$$$$"];
const STATUS_OPTIONS = ["open", "closed", "temporarily_closed"];
const ACCESS_OPTIONS = ["public", "private", "members_guests"];

export default function VenueEditor({ venue, cities, onSave, onDelete, onClose, adminFetch }: VenueEditorProps) {
  const fetchFn = adminFetch ?? fetch;
  const [name, setName] = useState(venue.name);
  const [category, setCategory] = useState(venue.category);
  const [subcategory, setSubcategory] = useState(venue.subcategory ?? "");
  const [neighborhood, setNeighborhood] = useState(venue.neighborhood ?? "");
  const [dennaNotes, setDennaNotes] = useState(venue.denna_note ?? "");
  const [price, setPrice] = useState(venue.price_indicator ?? "");
  const [status, setStatus] = useState(venue.status ?? "open");
  const [access, setAccess] = useState(venue.access ?? "public");
  const [displayOrder, setDisplayOrder] = useState(venue.display_order?.toString() ?? "");
  const [needsReview, setNeedsReview] = useState(venue.needs_review);
  const [cityId, setCityId] = useState(venue.city_id ?? "");
  const [essential24h, setEssential24h] = useState((venue as Record<string, unknown>).essential_24h === true);
  const [essential48h, setEssential48h] = useState((venue as Record<string, unknown>).essential_48h === true);
  const [essential72h, setEssential72h] = useState((venue as Record<string, unknown>).essential_72h === true);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Use a ref to always have the latest form values for the debounced save
  const formRef = useRef({
    name, category, subcategory, neighborhood, dennaNotes,
    price, status, access, displayOrder, needsReview, cityId,
    essential24h, essential48h, essential72h,
  });

  // Keep the ref in sync with state
  useEffect(() => {
    formRef.current = {
      name, category, subcategory, neighborhood, dennaNotes,
      price, status, access, displayOrder, needsReview, cityId,
      essential24h, essential48h, essential72h,
    };
  });

  // Reset when venue changes
  useEffect(() => {
    setName(venue.name);
    setCategory(venue.category);
    setSubcategory(venue.subcategory ?? "");
    setNeighborhood(venue.neighborhood ?? "");
    setDennaNotes(venue.denna_note ?? "");
    setPrice(venue.price_indicator ?? "");
    setStatus(venue.status ?? "open");
    setAccess(venue.access ?? "public");
    setDisplayOrder(venue.display_order?.toString() ?? "");
    setNeedsReview(venue.needs_review);
    setCityId(venue.city_id ?? "");
    setEssential24h((venue as Record<string, unknown>).essential_24h === true);
    setEssential48h((venue as Record<string, unknown>).essential_48h === true);
    setEssential72h((venue as Record<string, unknown>).essential_72h === true);
    setSaved(false);
  }, [venue]);

  const save = useCallback(async () => {
    const f = formRef.current;
    const updates: Record<string, unknown> = {
      name: f.name,
      category: f.category,
      subcategory: f.subcategory || null,
      neighborhood: f.neighborhood || null,
      denna_note: f.dennaNotes || null,
      price_indicator: f.price || null,
      status: f.status,
      access: f.access,
      display_order: f.displayOrder ? parseInt(f.displayOrder, 10) : null,
      needs_review: f.needsReview,
      essential_24h: f.essential24h,
      essential_48h: f.essential48h,
      essential_72h: f.essential72h,
    };
    // Include city_id only if it changed
    if (f.cityId && f.cityId !== venue.city_id) {
      updates.city_id = f.cityId;
    }
    await onSave(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [onSave, venue.city_id]);

  const debouncedSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 800);
  }, [save]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "venues");

    const res = await fetchFn("/api/admin/upload", { method: "POST", body: formData });
    if (res.ok) {
      const { url } = await res.json();
      await onSave({ image_url: url });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif text-lg text-brown">Edit Venue</h3>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs font-mono text-green-600">Saved</span>}
          <button onClick={onClose} className="text-muted hover:text-brown text-xl">&times;</button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); debouncedSave(); }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold"
          />
        </div>

        {/* Move to City */}
        {cities && cities.length > 0 && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">City</label>
            <select
              value={cityId}
              onChange={(e) => { setCityId(e.target.value); debouncedSave(); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream"
            >
              <option value="">—</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.city_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Category + Subcategory */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); debouncedSave(); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Subcategory</label>
            <input
              value={subcategory}
              onChange={(e) => { setSubcategory(e.target.value); debouncedSave(); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        {/* Neighborhood */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Neighborhood</label>
          <input
            value={neighborhood}
            onChange={(e) => { setNeighborhood(e.target.value); debouncedSave(); }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold"
          />
        </div>

        {/* Denna's Note */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Denna&apos;s Note</label>
          <p className="text-[10px] font-mono text-muted/70 mb-1.5">Internal note. Claude reads this when writing recommendations but it&apos;s never shown to users directly. Write whatever is helpful, stream-of-consciousness is fine.</p>
          <textarea
            value={dennaNotes}
            onChange={(e) => { setDennaNotes(e.target.value); debouncedSave(); }}
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold resize-y"
          />
        </div>

        {/* Denna's Essentials */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Denna&apos;s Essentials</label>
          <p className="text-[10px] font-mono text-muted/70 mb-2">Mark venues that are must-visits for trips of this length. These get priority in itinerary generation.</p>
          <div className="flex gap-3">
            {[
              { label: "24hr trip", value: essential24h, setter: setEssential24h },
              { label: "48hr trip", value: essential48h, setter: setEssential48h },
              { label: "72hr trip", value: essential72h, setter: setEssential72h },
            ].map(({ label, value, setter }) => (
              <button
                key={label}
                onClick={() => { setter(!value); debouncedSave(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                  value
                    ? "bg-gold/15 border-gold/40 text-gold"
                    : "border-border text-muted hover:border-gold/30"
                }`}
              >
                {value ? "★" : "☆"} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Price + Status + Access */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Price</label>
            <select
              value={price}
              onChange={(e) => { setPrice(e.target.value); debouncedSave(); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream"
            >
              {PRICE_OPTIONS.map((p) => <option key={p} value={p}>{p || "—"}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); debouncedSave(); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream"
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Access</label>
            <select
              value={access}
              onChange={(e) => { setAccess(e.target.value); debouncedSave(); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream"
            >
              {ACCESS_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Display Order */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Display Order</label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => { setDisplayOrder(e.target.value); debouncedSave(); }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-brown bg-cream focus:outline-none focus:border-gold"
          />
        </div>

        {/* Needs Review toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setNeedsReview(!needsReview); debouncedSave(); }}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-colors ${
              needsReview
                ? "bg-red-500/10 border-red-500/30 text-red-600"
                : "bg-green-600/10 border-green-600/30 text-green-700"
            }`}
          >
            {needsReview ? "Needs Review" : "Reviewed"}
          </button>
        </div>

        {/* Image */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Image</label>
          {venue.image_url && (
            <img src={venue.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
          )}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs font-mono" />
        </div>

        {/* Location info (read-only) */}
        {venue.address && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted font-mono mb-1">Address</label>
            <p className="text-xs font-mono text-secondary">{venue.address}</p>
          </div>
        )}

        {/* Links */}
        <div className="flex gap-3 text-xs font-mono">
          {venue.google_maps_url && (
            <a href={venue.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Google Maps</a>
          )}
          {venue.instagram && (
            <a href={`https://instagram.com/${venue.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Instagram</a>
          )}
          {venue.website && (
            <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Website</a>
          )}
        </div>

        {/* Save + Delete */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <button
            onClick={save}
            className="flex-1 px-4 py-2 bg-brown text-cream text-xs font-mono rounded-lg hover:bg-brown/90 transition-colors"
          >
            Save
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 border border-red-500/30 text-red-600 text-xs font-mono rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
