import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif:      ["var(--font-serif)",  "Newsreader",      "Georgia",       "serif"],
        sans:       ["var(--font-sans)",   "Instrument Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        hand:       ["var(--font-hand)",   "Kalam",           "cursive"],
        mono:       ["var(--font-mono)",   "JetBrains Mono",  "ui-monospace",  "monospace"],
      },
      colors: {
        // Paper palette via CSS vars
        paper:   "var(--paper)",
        ink:     "var(--ink)",
        soft:    "var(--soft)",
        card:    "var(--card)",
        accent:  "var(--accent)",
      },
      animation: {
        "fade-in":    "fadeIn 1s ease-out forwards",
        "fade-in-up": "fadeInUp 1s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
export default config;
