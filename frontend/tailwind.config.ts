import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primärer Lime-Akzent (Climbr-Identität).
        accent: {
          DEFAULT: "#D4F26B",
          hover: "#BEE34F",
          soft: "#E4F89A",
          dim: "rgba(212, 242, 107, 0.12)",
        },
        // Matte Komplementär-Palette für Charts & sekundäre Akzente.
        // Alle Töne sind entsättigt, damit sie neben Lime nicht konkurrieren.
        violet: {
          DEFAULT: "#B49DD4",
          soft: "#CDB9E4",
          dim: "rgba(180, 157, 212, 0.14)",
        },
        amber: {
          DEFAULT: "#F2C26B",
          soft: "#F6D699",
          dim: "rgba(242, 194, 107, 0.14)",
        },
        teal: {
          DEFAULT: "#6BD4C2",
          soft: "#9BE2D5",
          dim: "rgba(107, 212, 194, 0.14)",
        },
        rose: {
          DEFAULT: "#D49DA5",
          soft: "#E0B7BD",
          dim: "rgba(212, 157, 165, 0.14)",
        },
        bg: {
          DEFAULT: "#08090B",
          raised: "#101113",
          elevated: "#16181C",
        },
        ink: {
          DEFAULT: "#ECECEE",
          muted: "#8A8F98",
          subtle: "#5C6068",
        },
        line: "rgba(255, 255, 255, 0.08)",
        "line-strong": "rgba(255, 255, 255, 0.14)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glow: "0 0 60px -10px rgba(212, 242, 107, 0.35)",
        "glow-sm": "0 0 24px -6px rgba(212, 242, 107, 0.4)",
        "glow-violet": "0 0 60px -10px rgba(180, 157, 212, 0.30)",
      },
    },
  },
  plugins: [],
} satisfies Config;
