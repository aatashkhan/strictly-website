"use client";

import { useState, useEffect, useMemo } from "react";

const genericPhrases = [
  "Pulling Denna\u2019s strict picks\u2026",
  "Curating the good stuff\u2026",
  "Building your perfect trip\u2026",
  "Almost there\u2026",
];

const cityTips: Record<string, string[]> = {
  Paris: [
    "Skip the tourist traps near the Eiffel Tower \u2014 the real food is in the 11th",
    "Order the croissant at the counter, not the table (it\u2019s cheaper and just as good)",
    "Le Marais on a Sunday morning is strictly the move",
  ],
  Rome: [
    "Trastevere has the best dinner energy in the city",
    "Never sit down at a piazza caf\u00E9 unless you\u2019re ready for the coperto",
    "Gelato rule: if it\u2019s piled high and neon, walk away",
  ],
  Tokyo: [
    "Convenience store onigiri at 2am hits different",
    "Shibuya for vibes, Shimokitazawa for the real finds",
    "The department store basement food halls are an actual paradise",
  ],
  London: [
    "Borough Market before 11am, before it gets chaotic",
    "Shoreditch for brunch, Soho for dinner, Hackney for drinks",
    "The pub lunch is genuinely underrated \u2014 lean into it",
  ],
  Seoul: [
    "Myeongdong is for skincare shopping, not food",
    "Late-night Korean BBQ is a non-negotiable",
    "Ikseon-dong is the neighborhood moment right now",
  ],
  "Los Angeles": [
    "Driving is inevitable but the taco truck game is worth it",
    "Arts District for coffee, Silver Lake for dinner",
    "Get to the beach by 7am \u2014 you\u2019ll have it to yourself",
  ],
  Copenhagen: [
    "Bike everywhere. Seriously, everywhere.",
    "The New Nordic thing is real and honestly worth the splurge",
    "N\u00F8rrebro has the best natural wine bars",
  ],
  "New York City": [
    "Chinatown for the strictly best dumplings, no contest",
    "West Village for a perfect dinner walk",
    "The High Line at sunset \u2014 it\u2019s a clich\u00E9 because it works",
  ],
};

interface LoadingScreenProps {
  city?: string;
}

export default function LoadingScreen({ city }: LoadingScreenProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  const phrases = useMemo(() => {
    if (city && cityTips[city]) {
      return [...genericPhrases.slice(0, 2), ...cityTips[city], ...genericPhrases.slice(2)];
    }
    return genericPhrases;
  }, [city]);

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
