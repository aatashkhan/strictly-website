"use client";

import { useState, useEffect, useMemo } from "react";

const genericPhrases = [
  "Pulling Denna\u2019s strict picks\u2026",
  "Curating the good stuff\u2026",
  "Building your perfect trip\u2026",
  "Mapping out the vibes\u2026",
  "Finding the spots only locals know\u2026",
  "This is going to be so good\u2026",
  "Almost there\u2026",
];

interface LoadingScreenProps {
  city?: string;
  loadingTips?: string[];
}

export default function LoadingScreen({ city, loadingTips }: LoadingScreenProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  const phrases = useMemo(() => {
    if (loadingTips && loadingTips.length > 0) {
      return [...genericPhrases.slice(0, 2), ...loadingTips, ...genericPhrases.slice(2)];
    }
    return genericPhrases;
  }, [loadingTips]);

  useEffect(() => {
    setPhraseIndex(0);
  }, [city]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [phrases.length]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Spinner */}
      <div className="w-12 h-12 border-2 border-border border-t-gold rounded-full animate-spin mb-8" />

      {/* City name */}
      {city && (
        <p className="font-mono text-sm text-gold uppercase tracking-widest mb-3">
          {city}
        </p>
      )}

      {/* Rotating phrase */}
      <p className="font-mono text-lg text-muted text-center max-w-md transition-opacity duration-300">
        {phrases[phraseIndex]}
      </p>
    </div>
  );
}
