"use client";

import { useState } from "react";

interface EmailGateProps {
  isOpen: boolean;
  onSubmit: (email: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function EmailGate({ isOpen, onSubmit, onSkip, onClose }: EmailGateProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    onSubmit(email);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brown/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-cream border border-border rounded-2xl shadow-xl max-w-md w-full p-8 animate-[scaleIn_0.2s_ease-out]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-brown transition-colors text-2xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        <h2 className="font-mono text-3xl text-brown text-center mb-3">
          One last thing!
        </h2>
        <p className="font-mono text-secondary text-sm text-center mb-8 leading-relaxed">
          Drop your email to get your personalized itinerary. We&apos;ll also
          send you a copy!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold transition-colors"
            />
            {error && (
              <p className="text-gold text-xs mt-2 font-mono">{error}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-gold text-white font-mono text-sm rounded-full hover:bg-gold/90 transition-colors"
          >
            Get My Itinerary
          </button>
        </form>

        <button
          onClick={onSkip}
          className="w-full mt-3 py-2 text-sm font-mono text-muted hover:text-brown transition-colors text-center"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
