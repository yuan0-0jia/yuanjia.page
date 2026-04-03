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
        typewriter: ["var(--font-typewriter)", "Courier", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      colors: {
        // Warm amber palette
        // Core: #FFA401, #CC9329, #99793D, #66583D, #332F29
        cream: "#fdf9f2",
        parchment: "#f5efe3",
        sepia: {
          50: "#fefcf6",
          100: "#faf5e6",
          200: "#f2e5c8",
          300: "#e5cc8e",
          400: "#FFA401",  // bright amber
          500: "#CC9329",  // warm gold
          600: "#99793D",  // bronze
          700: "#66583D",  // dark bronze
          800: "#4a4133",  // deep brown
          900: "#332F29",  // charcoal
        },
        warmGray: {
          50: "#faf9f6",
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
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "typewriter": "typewriter 2s steps(20) forwards",
        "blink": "blink 0.8s step-end infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        typewriter: {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
export default config;
