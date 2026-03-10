"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AdminChatProps {
  onClose: () => void;
  onRefresh: () => void;
}

export default function AdminChat({ onClose, onRefresh }: AdminChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: updatedMessages.slice(-20),
        }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const data = await res.json();

      let content = data.message || "";
      if (data.toolResults?.length) {
        content += "\n\n" + data.toolResults.join("\n");
      }

      setMessages((prev) => [...prev, { role: "assistant", content }]);

      if (data.refreshNeeded) {
        onRefresh();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again?" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-cream z-50 shadow-2xl flex flex-col border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <p className="uppercase text-xs tracking-widest text-gold font-mono">AI Assistant</p>
          <p className="text-[10px] font-mono text-muted mt-0.5">Manage venues with natural language</p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-brown text-2xl font-mono">&times;</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="font-mono text-sm text-muted mb-4">Try something like:</p>
            <div className="space-y-2">
              {[
                "Show me all Paris restaurants without a neighborhood",
                "Add a note to all Tokyo cafes that need review",
                "Change category of 'Bar XYZ' from eat to drink",
                "How many venues need review in London?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="block w-full text-left px-4 py-2 bg-surface border border-border rounded-lg text-xs font-mono text-secondary hover:border-gold transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-mono leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-brown text-cream rounded-br-sm"
                  : "bg-surface border border-border text-brown rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
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
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask me to update venues..."
            rows={1}
            className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl text-sm font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold resize-none"
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
  );
}
