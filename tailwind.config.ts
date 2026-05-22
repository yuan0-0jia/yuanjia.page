import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif:      ["var(--font-serif)",  "Newsreader",      "Georgia",       "serif"],
        sans:       ["var(--font-sans)",   "Instrument Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        hand:       ["var(--font-hand)",   "Kalam",           "cursive"],
        mono:       ["var(--font-mono)",   "JetBrains Mono",  "ui-monospace",  "monospace"],
        // Backward-compat alias
        typewriter: ["var(--font-mono)",   "JetBrains Mono",  "ui-monospace",  "monospace"],
      },
      colors: {
        // Paper palette via CSS vars
        paper:   "var(--paper)",
        ink:     "var(--ink)",
        soft:    "var(--soft)",
        card:    "var(--card)",
        accent:  "var(--accent)",
        // Legacy static tokens kept for any remaining usages
        cream:     "#f1ecdd",
        parchment: "#e6dfca",
        sepia: {
          50:  "#fefcf6",
          100: "#faf5e6",
          200: "#f2e5c8",
          300: "#e5cc8e",
          400: "#FFA401",
          500: "#CC9329",
          600: "#99793D",
          700: "#66583D",
          800: "#4a4133",
          900: "#332F29",
        },
        warmGray: {
          50:  "#faf9f6",
          100: "#f3f1ec",
          200: "#e7e4dc",
          300: "#d2cec4",
          400: "#a8a396",
          500: "#7d776b",
          600: "#66583D",
          700: "#4a4133",
          800: "#332F29",
          900: "#1e1c18",
        },
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
