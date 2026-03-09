"use client";

import { useState } from "react";
import Link from "next/link";
import type { TripFormData } from "@/lib/types";

interface TripCardProps {
  id: string;
  city: string;
  tripData: TripFormData;
  status: string;
  createdAt: string;
  startsOn: string | null;
  onDelete: (id: string) => void;
}

function getStatusInfo(status: string, startsOn: string | null) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (startsOn) {
    const start = new Date(startsOn + "T00:00:00");
    if (status === "completed") return { label: "Completed", color: "text-muted bg-muted/10 border-muted/30" };
    if (start > today) return { label: "Upcoming", color: "text-gold bg-gold/10 border-gold/30" };
    return { label: "Active", color: "text-green-700 bg-green-600/10 border-green-600/30" };
  }

  if (status === "completed") return { label: "Completed", color: "text-muted bg-muted/10 border-muted/30" };
  return { label: "Draft", color: "text-secondary bg-surface border-border" };
}

export default function TripCard({ id, city, tripData, status, createdAt, startsOn, onDelete }: TripCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const statusInfo = getStatusInfo(status, startsOn);

  const dateLabel = startsOn
    ? new Date(startsOn + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="border border-border rounded-2xl p-6 hover:border-gold/40 transition-all group relative">
      <Link href={`/trips/${id}`} className="block">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-mono text-2xl font-bold text-brown group-hover:text-gold transition-colors">
            {city}
          </h3>
          <span className={`text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <p className="text-xs font-mono text-muted mb-3">{dateLabel}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-border text-secondary">
            {tripData.duration} nights
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-border text-secondary">
            {tripData.companions}
          </span>
          {tripData.vibes?.slice(0, 2).map((v) => (
            <span key={v} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold/10 border border-gold/30 text-gold">
              {v}
            </span>
          ))}
        </div>
      </Link>

      {/* Delete button */}
      {confirmDelete ? (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs font-mono text-secondary">Delete this trip?</span>
          <button
            onClick={() => onDelete(id)}
            className="text-xs font-mono text-red-600 hover:text-red-700 transition-colors"
          >
            Yes, delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs font-mono text-muted hover:text-brown transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-[10px] font-mono text-muted hover:text-red-500 transition-colors mt-2"
        >
          Delete
        </button>
      )}
    </div>
  );
}
