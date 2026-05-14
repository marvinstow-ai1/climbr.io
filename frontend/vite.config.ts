import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Read .env / .env.local from the repo root so one file feeds both the
  // server (Vercel functions) and the client (this Vite build). The frontend
  // only sees VITE_* vars; the rest stay server-side.
  envDir: "..",
  server: {
    port: 5173,
    proxy: {
      // Used only when running Vite standalone (`npm --prefix frontend run
      // dev`). When the whole stack runs under `vercel dev`, that command
      // handles /api/* routing itself and this proxy is bypassed.
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
