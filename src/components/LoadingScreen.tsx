"use client";

import { useState, useEffect, useMemo } from "react";

const genericPhrases = [
  "Pulling Denna\u2019s strict picks\u2026",
  "Curating the good stuff\u2026",
  "Building your perfect trip\u2026",
  "Mapping out the vibes\u2026",
  "Locking in the reservations\u2026",
  "Finding the spots only locals know\u2026",
  "This is going to be so good\u2026",
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
  "Mexico City": [
    "Roma Norte is the neighborhood for everything",
    "Street tacos after midnight are a spiritual experience",
    "The mercados are better than any restaurant",
  ],
  Nashville: [
    "Broadway is for tourists \u2014 East Nashville is the real scene",
    "Hot chicken is a must but pace yourself",
    "The songwriter rounds are the best live music in the country",
  ],
  Miami: [
    "Design District for shopping, Wynwood for the energy",
    "Little Havana for the cafecito, always",
    "South Beach at sunrise before the crowds",
  ],
  Barcelona: [
    "El Born over the Gothic Quarter every time",
    "Vermut hour is sacred \u2014 respect the tradition",
    "Skip La Rambla, walk Passeig de Gr\u00E0cia instead",
  ],
  Lisbon: [
    "Alfama is the soul of the city",
    "The pastel de nata at Time Out Market is overrated \u2014 go to Manteigaria",
    "Take the 28 tram early or not at all",
  ],
  Amsterdam: [
    "Jordaan is the strictly best neighborhood, no debate",
    "The canal-side restaurants are a vibe but check reviews first",
    "Rent a bike on day one \u2014 you\u2019ll never look back",
  ],
  Marrakech: [
    "Get lost in the medina on purpose \u2014 that\u2019s where the magic is",
    "Rooftop dinner with a view of the Atlas Mountains",
    "The riads are the move over big hotels",
  ],
  Austin: [
    "South Congress for the walk, East Austin for the food",
    "BBQ lines are long but they\u2019re not lying about the brisket",
    "Live music on a random Tuesday \u2014 that\u2019s the Austin promise",
  ],
  Tulum: [
    "Beach clubs are pricey but pick one good one",
    "The cenotes are worth the drive every time",
    "Rent a bike, skip the taxi drama",
  ],
  "San Francisco": [
    "Mission District for the best burrito of your life",
    "Fog is part of the aesthetic \u2014 layer up",
    "The ferry building on Saturday morning is a must",
  ],
  Charleston: [
    "King Street for shopping, Husk for dinner",
    "The lowcountry cuisine is genuinely special",
    "Golden hour on the Battery is undefeated",
  ],
  Kyoto: [
    "Arashiyama bamboo grove at 7am, before the crowds",
    "The kaiseki meal is worth the splurge",
    "Temple-hop on foot \u2014 it\u2019s the best way to see the city",
  ],
};

interface LoadingScreenProps {
  city?: string;
}

export default function LoadingScreen({ city }: LoadingScreenProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  const phrases = useMemo(() => {
    if (!city) return genericPhrases;
    // Fuzzy match city name (case-insensitive, partial match)
    const tips = cityTips[city] ?? Object.entries(cityTips).find(
      ([key]) => key.toLowerCase() === city.toLowerCase() || city.toLowerCase().includes(key.toLowerCase())
    )?.[1];
    if (tips) {
      return [...genericPhrases.slice(0, 2), ...tips, ...genericPhrases.slice(2)];
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
