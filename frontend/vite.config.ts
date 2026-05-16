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
  build: {
    // Routes are lazy-loaded in App.tsx; split heavy vendors so the initial
    // bundle stays small and shared deps are cached across page chunks.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return "react-vendor";
          }
          if (id.includes("/@supabase/")) return "supabase";
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    hmr: inCodespaces
      ? { clientPort: 443, protocol: "wss" }
      : undefined,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        // Audits can take ~15s (page crawl + robots fetch). Default
        // http-proxy timeouts are short enough to cut off the response
        // and leave the browser with a 504 — bump both legs to 60s.
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
    },
  },
});
