import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#D4F26B",
          hover: "#BEE34F",
          soft: "#E4F89A",
          dim: "rgba(212, 242, 107, 0.12)",
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
      },
    },
  },
  plugins: [],
} satisfies Config;
