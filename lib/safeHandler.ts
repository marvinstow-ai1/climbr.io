// Top-level safety wrapper für alle Vercel-Serverless-Handler.
//
// Ohne Wrapper:  unbehandelter `throw` → Vercel sendet ein generisches
//                HTML-"500: Internal Server Error" ohne Body → Frontend
//                sieht nur "Failed to load resource: 500".
//
// Mit Wrapper:   jeder ungefangene Throw landet in einem strukturierten
//                JSON-Body { error: { message, code, requestId } } und
//                wird mit Stack-Trace + Pfad in die Vercel-Function-Logs
//                geschrieben. Frontend kann die Message direkt im Toast
//                anzeigen, und wir können im Log nach `requestId` suchen.
//
// Verwendung in einem Handler:
//
//   import { safeHandler } from "../lib/safeHandler.js";
//   async function _handler(req: Request): Promise<Response> { ... }
//   export default safeHandler("api/seo", _handler);
//

import { json } from "./validation.js";

type Handler = (req: Request) => Promise<Response>;

export function safeHandler(label: string, fn: Handler): Handler {
  return async (req: Request): Promise<Response> => {
    const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      return await fn(req);
    } catch (err) {
      // Wichtig: niemals den vollen Stack im Body zurückgeben (Info-Leak).
      // Nur die Message — und nur die ersten 500 Zeichen, falls eine
      // verbose Lib (z. B. zod) lange Traces produziert.
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : "unknown error";
      // Häufige, sicher-zu-zeigende Fehler erkennen und mit klarem Code mappen.
      const code = classify(err);

      // Server-seitig: voller Kontext für die Vercel-Logs.
      console.error(
        `[${label}] ${requestId} ${req.method} ${safeUrl(req.url)} -> ${code} ${message.slice(0, 200)}`,
        err instanceof Error ? err.stack : "",
      );

      const status = code === "AUTH_REQUIRED" || code === "INVALID_TOKEN" ? 401 : 500;
      return json(
        { error: { code, message: message.slice(0, 500), requestId } },
        { status },
      );
    }
  };
}

function classify(err: unknown): string {
  const msg = (err instanceof Error ? err.message : "").toLowerCase();
  if (msg.includes("supabase_url") || msg.includes("supabase_service_role_key") || msg.includes("supabase_anon_key")) {
    return "SUPABASE_ENV_MISSING";
  }
  if (msg.includes("token_encryption_key")) return "ENCRYPTION_KEY_MISSING";
  if (msg.includes("oauth_state_secret") || msg.includes("gsc_client_id")) return "GSC_ENV_MISSING";
  if (msg.includes("openai_api_key")) return "OPENAI_ENV_MISSING";
  if (msg.includes("relation") && msg.includes("does not exist")) return "DB_TABLE_MISSING";
  if (msg.includes("permission denied")) return "DB_PERMISSION_DENIED";
  if (msg.includes("invalid json")) return "BAD_JSON";
  if (msg.includes("fetch failed") || msg.includes("network")) return "UPSTREAM_NETWORK";
  return "INTERNAL_ERROR";
}

function safeUrl(raw: string): string {
  // Pfad + Query loggen, aber Tokens aus dem Query strippen.
  try {
    const u = new URL(raw);
    for (const key of ["token", "code", "state", "access_token", "refresh_token"]) {
      if (u.searchParams.has(key)) u.searchParams.set(key, "[redacted]");
    }
    return u.pathname + (u.search ? u.search : "");
  } catch {
    return raw.slice(0, 200);
  }
}
