import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2B8AF3",
          50: "#EBF3FE",
          100: "#D7E7FD",
          500: "#2B8AF3",
          600: "#1E72D1",
          700: "#175AA8",
        },
        sunset: {
          DEFAULT: "#FF8A4B",
          50: "#FFF1E8",
          500: "#FF8A4B",
          600: "#E66F33",
        },
        ink: "#0F172A",
        slate2: "#64748B",
        surface: "#F8FAFC",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
