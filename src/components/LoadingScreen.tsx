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
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        {/* Progress arc */}
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
      {/* Center content */}
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

/** Typewriter effect for a single string */
function TypewriterText({ text, speed = 35 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [currentText, setCurrentText] = useState(text);

  useEffect(() => {
    if (text !== currentText) {
      // New phrase — reset and type out
      setDisplayed("");
      setCurrentText(text);
    }
  }, [text, currentText]);

  useEffect(() => {
    if (displayed.length >= currentText.length) return;

    const timer = setTimeout(() => {
      setDisplayed(currentText.slice(0, displayed.length + 1));
    }, speed);

    return () => clearTimeout(timer);
  }, [displayed, currentText, speed]);

  return (
    <span>
      {displayed}
      {displayed.length < currentText.length && (
        <span className="inline-block w-[2px] h-[1.1em] bg-gold/70 ml-[1px] align-text-bottom animate-blink" />
      )}
    </span>
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

  // Advance phrases — give enough time for typewriter to finish + a pause
  const advancePhrase = useCallback(() => {
    setPhraseIndex((prev) => (prev + 1) % phrases.length);
  }, [phrases.length]);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    // Time to type out + 1.5s pause to read
    const typingTime = currentPhrase.length * 35 + 1500;
    const timer = setTimeout(advancePhrase, typingTime);
    return () => clearTimeout(timer);
  }, [phraseIndex, phrases, advancePhrase]);

  // Completion animation
  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => setIsComplete(true), 200);
      return () => clearTimeout(timer);
    }
    setIsComplete(false);
  }, [progress]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Progress ring */}
      <ProgressRing progress={progress} complete={isComplete} />

      {/* City name */}
      {city && (
        <p className="font-mono text-sm text-gold uppercase tracking-widest mb-4">
          {city}
        </p>
      )}

      {/* Typewriter phrase */}
      <p className="font-mono text-lg text-muted text-center max-w-md h-8">
        {isComplete ? (
          <span className="text-green-600 transition-opacity duration-300">
            Your itinerary is ready!
          </span>
        ) : (
          <TypewriterText key={phraseIndex} text={phrases[phraseIndex]} />
        )}
      </p>

      {/* Custom keyframe styles */}
      <style jsx>{`
        @keyframes scale-check {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        :global(.animate-scale-check) {
          animation: scale-check 0.4s ease-out forwards;
        }
        :global(.animate-blink) {
          animation: blink 0.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
