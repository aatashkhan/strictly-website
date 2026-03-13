import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "rgb(var(--color-bg) / <alpha-value>)",
        brown: "rgb(var(--color-text) / <alpha-value>)",
        gold: "rgb(var(--color-accent) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        light: "rgb(var(--color-light) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        eat: "rgb(var(--color-eat) / <alpha-value>)",
        stay: "rgb(var(--color-stay) / <alpha-value>)",
        explore: "rgb(var(--color-explore) / <alpha-value>)",
        shop: "rgb(var(--color-shop) / <alpha-value>)",
        drink: "rgb(var(--color-drink) / <alpha-value>)",
        spa: "rgb(var(--color-spa) / <alpha-value>)",
      },
      fontFamily: {
        mono: ["Roboto Mono", "monospace"],
      },
      keyframes: {
        scroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        scroll: "scroll 30s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
