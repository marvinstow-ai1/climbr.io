import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Codespaces forwards the dev port through an HTTPS tunnel on
// `<id>-<port>.app.github.dev`. Vite needs three things to play nicely:
//   1. Listen on 0.0.0.0 so the tunnel can reach it (server.host).
//   2. Allow the forwarded Host header (allowedHosts).
//   3. Tell the HMR websocket to dial back over the public 443/wss URL,
//      not localhost:5173 (hmr.{clientPort,protocol}).
const inCodespaces = !!process.env.CODESPACES;

export default defineConfig({
  plugins: [react()],
  // Repo-root .env / .env.local feeds both the server (Vercel functions)
  // and the client (this Vite build). Frontend only sees VITE_* vars.
  envDir: "..",
  base: "/",
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    hmr: inCodespaces
      ? { clientPort: 443, protocol: "wss" }
      : undefined,
    proxy: {
      // Used only when running Vite standalone (`npm run dev`). Under
      // `vercel dev` (`npm run dev:vercel`) the Vercel router handles
      // /api/* and this proxy is bypassed.
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
