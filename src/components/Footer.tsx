"use client";

import { useState } from "react";

const socialLinks = [
  { label: "Instagram", href: "#" },
  { label: "TikTok", href: "#" },
  { label: "Pinterest", href: "#" },
];

export default function Footer() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email signup:", email);
    setEmail("");
  };

  return (
    <footer className="bg-cream border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Email signup */}
        <div className="max-w-md mx-auto text-center mb-14">
          <h3 className="font-mono text-2xl text-brown mb-6">
            Get the good stuff in your inbox
          </h3>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 px-4 py-3 bg-surface border border-border rounded-full text-sm font-mono text-brown placeholder:text-muted focus:outline-none focus:border-gold transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gold text-white text-sm font-mono rounded-full hover:bg-gold/90 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>

        {/* Social links */}
        <div className="flex justify-center gap-8 mb-8">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-mono text-secondary hover:text-gold transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Contact */}
        <div className="text-center mb-4">
          <a
            href="mailto:denna@strictlythegoodstuff.com"
            className="text-sm font-mono text-secondary hover:text-gold transition-colors"
          >
            denna@strictlythegoodstuff.com
          </a>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs font-mono text-muted">
          &copy; 2026 Strictly the Good Stuff. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
