"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

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
  progress?: number; // 0-100
}

/** Animated progress ring using SVG */
function ProgressRing({ progress, complete }: { progress: number; complete: boolean }) {
  const size = 120;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center mb-10">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-500 ease-out ${
            complete ? "text-green-500" : "text-gold"
          }`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {complete ? (
          <svg
            className="w-10 h-10 text-green-500 animate-scale-check"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className="font-mono text-lg text-gold tabular-nums">
            {Math.round(progress)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function LoadingScreen({ city, loadingTips, progress = 0 }: LoadingScreenProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const phrases = useMemo(() => {
    if (loadingTips && loadingTips.length > 0) {
      return [...genericPhrases.slice(0, 2), ...loadingTips, ...genericPhrases.slice(2)];
    }
    return genericPhrases;
  }, [loadingTips]);

  useEffect(() => {
    setPhraseIndex(0);
  }, [city]);

  const advancePhrase = useCallback(() => {
    setPhraseIndex((prev) => (prev + 1) % phrases.length);
  }, [phrases.length]);

  useEffect(() => {
    const timer = setTimeout(advancePhrase, 3000);
    return () => clearTimeout(timer);
  }, [phraseIndex, advancePhrase]);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => setIsComplete(true), 200);
      return () => clearTimeout(timer);
    }
    setIsComplete(false);
  }, [progress]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <ProgressRing progress={progress} complete={isComplete} />

      {city && (
        <p className="font-mono text-sm text-gold uppercase tracking-widest mb-4">
          {city}
        </p>
      )}

      <p className="font-mono text-lg text-muted text-center max-w-md h-8">
        {isComplete ? (
          <span className="text-green-600 transition-opacity duration-300">
            Your itinerary is ready!
          </span>
        ) : (
          phrases[phraseIndex]
        )}
      </p>

      <style jsx>{`
        @keyframes scale-check {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        :global(.animate-scale-check) {
          animation: scale-check 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
