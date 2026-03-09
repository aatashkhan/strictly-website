"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth";

export default function AuthButton() {
  const { user, loading } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (loading) return null;

  const closeModal = () => { setShowModal(false); setSent(false); setError(""); setEmail(""); };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/concierge" },
    });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/concierge" },
    });
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-secondary truncate max-w-[120px]">
          {user.email}
        </span>
        <button
          onClick={handleSignOut}
          className="text-xs font-mono text-muted hover:text-brown transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  const modal = showModal && mounted ? createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={closeModal}
    >
      <div
        className="bg-cream border border-border rounded-2xl p-8 max-w-sm w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-2xl text-muted hover:text-brown"
        >
          &times;
        </button>

        <h2 className="font-mono text-2xl font-bold text-brown mb-2">Sign in</h2>
        <p className="font-mono text-sm text-secondary mb-6">
          Save trips and access them on the go.
        </p>

        <button
          onClick={handleGoogle}
          className="w-full px-4 py-3 rounded-xl border border-border font-mono text-sm text-brown hover:border-gold hover:bg-surface transition-all mb-4 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs font-mono text-muted">or</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {sent ? (
          <p className="font-mono text-sm text-gold text-center py-4">
            Check your email for the magic link!
          </p>
        ) : (
          <form onSubmit={handleMagicLink}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-border bg-transparent font-mono text-sm text-brown placeholder:text-muted focus:outline-none focus:border-gold mb-3"
            />
            {error && (
              <p className="text-xs font-mono text-red-500 mb-2">{error}</p>
            )}
            <button
              type="submit"
              className="w-full px-4 py-3 rounded-xl bg-gold text-white font-mono text-sm hover:bg-gold/90 transition-colors"
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-sm font-mono text-secondary hover:text-brown transition-colors"
      >
        Sign in
      </button>
      {modal}
    </>
  );
}
