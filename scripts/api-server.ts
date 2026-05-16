// Minimal local API server that maps /api/* requests directly to the
// handlers under api/. Bypasses `vercel dev` entirely — no edge polyfill,
// no static-build sidecar, no cloud-env override. tsx runs the .ts files
// as-is. Vite (started by scripts/dev.mjs) proxies /api/* to here on :3000.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

type Handler = (req: Request) => Promise<Response>;

// Route table. Keep this short — only register what the manual test plan
// touches. Add more entries as features come online.
const routes: { match: (path: string) => boolean; load: () => Promise<{ default: Handler }> }[] = [
  { match: (p) => p === "/api/health",         load: () => import("../api/health.ts") },
  { match: (p) => p === "/api/audit/run",      load: () => import("../api/audit/run.ts") },
  { match: (p) => /^\/api\/audit\/[^/]+$/.test(p), load: () => import("../api/audit/[id].ts") },
  { match: (p) => p === "/api/projects",       load: () => import("../api/projects.ts") },
  { match: (p) => p === "/api/rankings/track", load: () => import("../api/rankings/track.ts") },
  { match: (p) => p === "/api/notifications",  load: () => import("../api/notifications.ts") },
  { match: (p) => p === "/api/gsc/connect",    load: () => import("../api/gsc/connect.ts") },
  { match: (p) => p === "/api/gsc/callback",   load: () => import("../api/gsc/callback.ts") },
  { match: (p) => p === "/api/gsc/disconnect", load: () => import("../api/gsc/disconnect.ts") },
  { match: (p) => p === "/api/settings",       load: () => import("../api/settings.ts") },
  { match: (p) => p === "/api/settings/notifications", load: () => import("../api/settings/notifications.ts") },
];

function nodeToWebRequest(req: IncomingMessage): Request {
  const host = req.headers.host ?? "localhost:3000";
  const url = `http://${host}${req.url ?? "/"}`;
  const method = (req.method ?? "GET").toUpperCase();
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    headers.set(k, Array.isArray(v) ? v.join(",") : v);
  }
  if (method === "GET" || method === "HEAD") {
    return new Request(url, { method, headers });
  }
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      req.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      req.on("end", () => controller.close());
      req.on("error", (err) => controller.error(err));
    },
  });
  // duplex: 'half' is required when passing a stream body. Node's Request
  // type doesn't include it yet, hence the cast.
  return new Request(url, { method, headers, body, duplex: "half" } as RequestInit);
}

async function writeWebResponse(response: Response, res: ServerResponse): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((v, k) => res.setHeader(k, v));
  if (!response.body) {
    res.end();
    return;
  }
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

const PORT = Number(process.env.API_PORT ?? "3000");

const server = createServer(async (req, res) => {
  const path = (req.url ?? "/").split("?")[0]!;
  const route = routes.find((r) => r.match(path));
  if (!route) {
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: { message: `no route for ${path}` } }));
    return;
  }
  try {
    const mod = await route.load();
    const handler = mod.default;
    const webReq = nodeToWebRequest(req);
    const webRes = await handler(webReq);
    await writeWebResponse(webRes, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api-server] ${path} threw:`, err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: { message: `handler crashed: ${message}` } }));
  }
});

server.listen(PORT, () => {
  console.log(`[api-server] listening on http://localhost:${PORT}`);
  console.log(`[api-server] SUPABASE_URL=${process.env.SUPABASE_URL ? "set" : "MISSING"}`);
  console.log(`[api-server] SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING"}`);
});
