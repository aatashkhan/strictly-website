"use client";

import { useState } from "react";
import type { FlightInfo } from "@/lib/types";

interface FlightInputProps {
  label: string;
  value: FlightInfo | null;
  onChange: (info: FlightInfo | null) => void;
}

const TIME_OPTIONS = [
  { value: "morning", label: "Morning (before noon)" },
  { value: "afternoon", label: "Afternoon (12-5 PM)" },
  { value: "evening", label: "Evening (5-9 PM)" },
  { value: "late-night", label: "Late night (after 9 PM)" },
];

export default function FlightInput({
  label,
  value,
  onChange,
}: FlightInputProps) {
  const [mode, setMode] = useState<"flight" | "general" | "skip">(
    value?.type ?? "skip"
  );

  const handleModeChange = (newMode: "flight" | "general" | "skip") => {
    setMode(newMode);
    if (newMode === "skip") {
      onChange(null);
    } else {
      onChange({
        type: newMode,
        date: value?.date ?? "",
        flightNumber: newMode === "flight" ? (value?.flightNumber ?? "") : undefined,
        time: newMode === "general" ? (value?.time ?? "") : undefined,
      });
    }
  };

  const updateField = (updates: Partial<FlightInfo>) => {
    if (!value) {
      onChange({ type: mode, date: "", ...updates });
    } else {
      onChange({ ...value, ...updates });
    }
  };

  return (
    <div>
      <label className="block uppercase text-xs tracking-widest text-muted font-mono mb-3">
        {label}
      </label>

      {/* Mode toggle */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => handleModeChange("flight")}
          className={`px-4 py-2 rounded-full border text-sm font-mono transition-all ${
            mode === "flight"
              ? "bg-brown text-cream border-brown"
              : "border-border text-secondary hover:border-gold"
          }`}
        >
          I have a flight number
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("general")}
          className={`px-4 py-2 rounded-full border text-sm font-mono transition-all ${
            mode === "general"
              ? "bg-brown text-cream border-brown"
              : "border-border text-secondary hover:border-gold"
          }`}
        >
          I know my general timing
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("skip")}
          className={`px-4 py-2 rounded-full border text-sm font-mono transition-all ${
            mode === "skip"
              ? "bg-brown text-cream border-brown"
              : "border-border text-secondary hover:border-gold"
          }`}
        >
          Skip
        </button>
      </div>

      {/* Flight number mode */}
      {mode === "flight" && (
        <div className="space-y-3 pl-1">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-muted font-mono mb-1">
                Flight number
              </label>
              <input
                type="text"
                value={value?.flightNumber ?? ""}
                onChange={(e) =>
                  updateField({ flightNumber: e.target.value.toUpperCase() })
                }
                placeholder="e.g. AA 123"
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-muted font-mono mb-1">
                Date
              </label>
              <input
                type="date"
                value={value?.date ?? ""}
                onChange={(e) => updateField({ date: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm font-mono text-brown focus:outline-none focus:border-gold transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* General timing mode */}
      {mode === "general" && (
        <div className="space-y-3 pl-1">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-muted font-mono mb-1">
                Date
              </label>
              <input
                type="date"
                value={value?.date ?? ""}
                onChange={(e) => updateField({ date: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm font-mono text-brown focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-muted font-mono mb-1">
                Time of day
              </label>
              <div className="relative">
                <select
                  value={value?.time ?? ""}
                  onChange={(e) => updateField({ time: e.target.value })}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm font-mono text-brown focus:outline-none focus:border-gold transition-colors appearance-none"
                >
                  <option value="">Select...</option>
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
