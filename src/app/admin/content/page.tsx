"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAdmin, useAdminFetch } from "../AdminContext";

interface ContentItem {
  id: string;
  section: string;
  key: string;
  value: string;
  value_type: string;
  label: string | null;
  helper_text: string | null;
  display_order: number;
}

const SECTION_LABELS: Record<string, string> = {
  hero: "Homepage Hero",
  homepage: "Homepage Sections",
  about: "About Page",
  footer: "Footer",
  concierge: "Concierge Taglines",
  ai_voice: "AI Voice & Personality",
  email: "Email Template",
};

const SECTION_ORDER = ["hero", "homepage", "about", "footer", "concierge", "ai_voice", "email"];

function ContentField({
  item,
  onSave,
}: {
  item: ContentItem;
  onSave: (id: string, value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(item.value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [undoValue] = useState(item.value);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const save = useCallback(async (newValue: string) => {
    setSaving(true);
    await onSave(item.id, newValue);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [item.id, onSave]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(newValue), 500);
  };

  const handleUndo = () => {
    setValue(undoValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    save(undoValue);
  };

  const isTextarea = item.value_type === "richtext" || item.value.length > 80 || item.key.includes("description") || item.key.includes("text") || item.key.includes("paragraph");
  const isList = item.value_type === "list";

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-mono font-medium text-brown">
          {item.label || item.key}
        </label>
        <div className="flex items-center gap-2">
          {saving && <span className="text-[10px] font-mono text-muted">Saving...</span>}
          {saved && <span className="text-[10px] font-mono text-green-600">Saved</span>}
          {value !== undoValue && (
            <button
              onClick={handleUndo}
              className="text-[10px] font-mono text-gold hover:underline"
            >
              Undo
            </button>
          )}
        </div>
      </div>
      {item.helper_text && (
        <p className="text-[10px] font-mono text-muted mb-1.5 italic">
          {item.helper_text}
        </p>
      )}
      {isList ? (
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          rows={Math.min(8, Math.max(2, value.split(",").length))}
          placeholder="Comma-separated values..."
          className="w-full px-3 py-2 bg-cream border border-border rounded-lg text-xs font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold resize-y"
        />
      ) : isTextarea ? (
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          rows={Math.min(6, Math.max(2, Math.ceil(value.length / 80)))}
          className="w-full px-3 py-2 bg-cream border border-border rounded-lg text-xs font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-3 py-2 bg-cream border border-border rounded-lg text-xs font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold"
        />
      )}
    </div>
  );
}

function VoicePreview({ items, adminFetch }: { items: ContentItem[]; adminFetch: (url: string, init?: RequestInit) => Promise<Response> }) {
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const getVal = (key: string) => items.find((i) => i.key === key)?.value ?? "";

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/preview-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personality: getVal("personality"),
          signature_words: getVal("signature_words"),
          words_to_avoid: getVal("words_to_avoid"),
          exclamation_level: getVal("exclamation_level"),
          obsessed_frequency: getVal("obsessed_frequency"),
          example_phrases: getVal("example_phrases"),
          signoff: getVal("signoff"),
        }),
      });
      const data = await res.json();
      setPreview(data.preview || data.error || "No preview generated");
    } catch {
      setPreview("Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <button
        onClick={handlePreview}
        disabled={loading}
        className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-xs font-mono hover:bg-gold/20 transition-colors disabled:opacity-50"
      >
        {loading ? "Generating..." : "Preview AI Voice"}
      </button>
      {preview && (
        <div className="mt-3 px-4 py-3 bg-surface border border-border rounded-xl">
          <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Sample recommendation</p>
          <p className="text-xs font-mono text-brown leading-relaxed italic">
            &ldquo;{preview}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

export default function ContentPage() {
  useAdmin();
  const adminFetch = useAdminFetch();
  const [sections, setSections] = useState<Record<string, ContentItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["hero"]));

  useEffect(() => {
    adminFetch("/api/admin/content")
      .then((r) => r.json())
      .then((data) => {
        setSections(data.sections ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [adminFetch]);

  const handleSave = async (id: string, value: string) => {
    const res = await adminFetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, value }),
    });
    if (res.ok) {
      const { item } = await res.json();
      setSections((prev) => {
        const next = { ...prev };
        for (const section of Object.keys(next)) {
          next[section] = next[section].map((i) => (i.id === id ? { ...i, ...item } : i));
        }
        return next;
      });
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const sortedSections = SECTION_ORDER.filter((s) => sections[s]);
  // Add any sections not in SECTION_ORDER
  for (const s of Object.keys(sections)) {
    if (!sortedSections.includes(s)) sortedSections.push(s);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-mono text-sm text-muted">Loading content...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-2xl text-brown">Site Content</h1>
          <p className="font-mono text-xs text-muted mt-1">
            Edit all user-facing text. Changes auto-save and take effect immediately.
          </p>
        </div>

        <div className="space-y-3">
          {sortedSections.map((section) => {
            const items = sections[section] ?? [];
            const isOpen = openSections.has(section);
            return (
              <div
                key={section}
                className="bg-surface border border-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-cream/50 transition-colors"
                >
                  <span className="font-mono text-sm font-medium text-brown">
                    {SECTION_LABELS[section] || section}
                  </span>
                  <span className="text-xs text-muted transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 divide-y divide-border/50">
                    {items.map((item) => (
                      <ContentField key={item.id} item={item} onSave={handleSave} />
                    ))}
                    {section === "ai_voice" && <VoicePreview items={items} adminFetch={adminFetch} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {Object.keys(sections).length === 0 && (
          <div className="text-center py-20">
            <p className="font-mono text-sm text-muted">
              No content found. Run the <code>scripts/003-site-content.sql</code> migration first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
