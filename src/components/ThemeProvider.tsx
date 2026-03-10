"use client";

import { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "dark", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

/** CSS variable names that map to site_content theme keys */
const COLOR_VAR_MAP: Record<string, string> = {
  color_bg: "--color-bg",
  color_text: "--color-text",
  color_accent: "--color-accent",
  color_secondary: "--color-secondary",
  color_muted: "--color-muted",
  color_border: "--color-border",
  color_surface: "--color-surface",
  color_eat: "--color-eat",
  color_stay: "--color-stay",
  color_explore: "--color-explore",
  color_shop: "--color-shop",
  color_drink: "--color-drink",
  color_spa: "--color-spa",
};

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("strictly-theme") as Theme | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  // Load custom theme colors from site_content API
  useEffect(() => {
    fetch("/api/theme")
      .then((r) => r.ok ? r.json() : null)
      .then((data: Record<string, string> | null) => {
        if (!data) return;
        const root = document.documentElement;
        for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
          if (data[key]) {
            root.style.setProperty(cssVar, data[key]);
          }
        }
      })
      .catch(() => {});
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("strictly-theme", next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
