"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ItineraryData, TripFormData } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: ItineraryData;
  tripData: TripFormData;
  onUpdate: (itinerary: ItineraryData) => void;
  completedItems?: string[];
}

function useGeolocation(enabled: boolean) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return location;
}

export default function ChatPanel({
  isOpen,
  onClose,
  itinerary,
  tripData,
  onUpdate,
  completedItems,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [showUpdated, setShowUpdated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const location = useGeolocation(isOpen);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
    }
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          itinerary,
          tripData,
          history: updatedMessages.slice(-10),
          context: {
            currentLocation: location,
            currentTime: new Date().toISOString(),
            completedItems: completedItems || [],
          },
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "text") {
              accumulatedText += event.content;
              setStreamingText(accumulatedText);
            } else if (event.type === "itinerary") {
              onUpdate(event.data);
              setShowUpdated(true);
              setTimeout(() => setShowUpdated(false), 2500);
            } else if (event.type === "done") {
              // Finalize the assistant message
              const finalMessage = accumulatedText || event.message || "";
              if (finalMessage) {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: finalMessage },
                ]);
              }
              setStreamingText("");
            } else if (event.type === "error") {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, something went wrong. Try again?" },
              ]);
              setStreamingText("");
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Try again?",
        },
      ]);
      setStreamingText("");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, itinerary, tripData, location, completedItems, onUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-cream z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="uppercase text-xs tracking-widest text-gold font-mono">
              Refine your trip
            </p>
            <p className="text-xs font-mono text-muted mt-0.5">
              Ask me to adjust anything
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-brown text-2xl font-mono transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Update confirmation toast */}
        {showUpdated && (
          <div className="mx-6 mt-2 px-4 py-2 bg-green-600/10 border border-green-600/30 rounded-xl text-center">
            <p className="text-xs font-mono text-green-700">Itinerary updated!</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && !streamingText && (
            <div className="text-center py-12">
              <p className="font-mono text-sm text-muted mb-4">
                Try something like:
              </p>
              <div className="space-y-2">
                {[
                  "Move dinner to a different neighborhood",
                  "Add a coffee stop after lunch on Day 2",
                  "I don't like shopping, swap those out",
                  "Make Day 1 more relaxed",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="block w-full text-left px-4 py-2.5 bg-surface border border-border rounded-xl text-xs font-mono text-secondary hover:border-gold transition-colors"
                  >
                    &ldquo;{suggestion}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-mono leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brown text-cream rounded-br-sm"
                    : "bg-surface border border-border text-brown rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Streaming text */}
          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm font-mono leading-relaxed bg-surface border border-border text-brown">
                {streamingText}
                <span className="inline-block w-1.5 h-4 bg-gold/60 ml-0.5 animate-pulse" />
              </div>
            </div>
          )}

          {/* Loading dots (only shown before any streaming starts) */}
          {loading && !streamingText && (
            <div className="flex justify-start">
              <div className="px-4 py-3 bg-surface border border-border rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-border">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me what to change..."
              rows={1}
              className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl text-sm font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold transition-colors resize-none"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className={`px-4 py-3 rounded-xl font-mono text-sm transition-all ${
                input.trim() && !loading
                  ? "bg-gold text-white hover:bg-gold/90"
                  : "bg-border text-muted cursor-not-allowed"
              }`}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
