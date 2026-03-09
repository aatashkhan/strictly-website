"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import AuthButton from "./AuthButton";

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Strictly Concierge", href: "/concierge" },
  { label: "My Trips", href: "/trips" },
  {
    label: "Substack",
    href: "https://strictlythegoodstuff.substack.com",
    external: true,
  },
  { label: "Shop", href: "/shop" },
];

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const router = useRouter();

  const guardedNavigate = useCallback((href: string, e: React.MouseEvent) => {
    const hasItinerary = (window as unknown as Record<string, boolean>).__strictlyHasItinerary;
    if (hasItinerary) {
      e.preventDefault();
      if (window.confirm("Are you sure you want to leave? Your itinerary will be lost.")) {
        (window as unknown as Record<string, boolean>).__strictlyHasItinerary = false;
        router.push(href);
      }
    }
  }, [router]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" onClick={(e) => guardedNavigate("/", e)} className="font-mono font-light text-2xl text-brown tracking-tight">
            strictly
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-secondary hover:text-brown transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={(e) => guardedNavigate(link.href, e)}
                  className="text-sm font-mono text-secondary hover:text-brown transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}

            <AuthButton />

            <Link
              href="/concierge"
              onClick={(e) => guardedNavigate("/concierge", e)}
              className="ml-2 px-5 py-2 bg-gold text-white text-sm font-mono rounded-full hover:bg-gold/90 transition-colors"
            >
              Try Concierge &rarr;
            </Link>

            <button
              onClick={toggle}
              className="ml-1 text-lg text-muted hover:text-brown transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-6 h-0.5 bg-brown transition-transform ${
                mobileOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-brown transition-opacity ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-brown transition-transform ${
                mobileOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-cream flex flex-col items-center justify-center gap-8">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-5 right-6 text-3xl text-brown"
            aria-label="Close menu"
          >
            &times;
          </button>
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="font-mono text-3xl text-brown hover:text-gold transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                onClick={(e) => { guardedNavigate(link.href, e); setMobileOpen(false); }}
                className="font-mono text-3xl text-brown hover:text-gold transition-colors"
              >
                {link.label}
              </Link>
            )
          )}

          <div className="mt-2">
            <AuthButton />
          </div>

          <Link
            href="/concierge"
            onClick={(e) => { guardedNavigate("/concierge", e); setMobileOpen(false); }}
            className="mt-4 px-8 py-3 bg-gold text-white font-mono rounded-full"
          >
            Try Concierge &rarr;
          </Link>

          <button
            onClick={toggle}
            className="mt-4 text-2xl text-muted hover:text-brown transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
          </button>
        </div>
      )}
    </>
  );
}
