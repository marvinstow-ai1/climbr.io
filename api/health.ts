import { serverClient } from "../lib/supabase.js";
import { json } from "../lib/validation.js";

export const config = { runtime: "nodejs", maxDuration: 10 };

/**
 * Diagnose-Endpoint — KEIN Auth nötig.
 *
 * Liefert pro kritischer Env-Variable ob sie "set" oder "missing" ist
 * (Werte werden nie geleakt, nur Längen). Pingt zusätzlich Supabase mit
 * einem 5-Sekunden-Hard-Timeout und meldet das genaue Ergebnis.
 *
 * Aufruf: GET /api/health
 */
export default async function handler(): Promise<Response> {
  const env = {
    SUPABASE_URL: maskEnv(process.env.SUPABASE_URL, { showHost: true }),
    SUPABASE_SERVICE_ROLE_KEY: maskEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
    SUPABASE_ANON_KEY: maskEnv(process.env.SUPABASE_ANON_KEY),
    VITE_SUPABASE_URL: maskEnv(process.env.VITE_SUPABASE_URL, { showHost: true }),
    VITE_SUPABASE_ANON_KEY: maskEnv(process.env.VITE_SUPABASE_ANON_KEY),
    TOKEN_ENCRYPTION_KEY: maskEnv(process.env.TOKEN_ENCRYPTION_KEY),
    OAUTH_STATE_SECRET: maskEnv(process.env.OAUTH_STATE_SECRET),
    GSC_CLIENT_ID: maskEnv(process.env.GSC_CLIENT_ID),
    GSC_CLIENT_SECRET: maskEnv(process.env.GSC_CLIENT_SECRET),
    GSC_REDIRECT_URI: maskEnv(process.env.GSC_REDIRECT_URI, { showHost: true }),
    OPENAI_API_KEY: maskEnv(process.env.OPENAI_API_KEY),
    USE_MOCK_AI: process.env.USE_MOCK_AI ?? "(unset)",
    DATAFORSEO_LOGIN: maskEnv(process.env.DATAFORSEO_LOGIN),
    DATAFORSEO_PASSWORD: maskEnv(process.env.DATAFORSEO_PASSWORD),
    MOCK_DATAFORSEO: process.env.MOCK_DATAFORSEO ?? "(unset)",
  };

  // Pflicht-Vars die für die App nicht-fehlen-dürfen.
  const required: (keyof typeof env)[] = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
  ];
  const missing = required.filter((k) => env[k] === "missing");

  // Supabase-Ping mit 5s Hard-Timeout. Hilft die "hängende Functions"
  // Symptome zu diagnostizieren (504 in den App-Endpoints).
  let supabasePing: string;
  let supabaseLatencyMs: number | null = null;
  const t0 = Date.now();
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabasePing = "skipped: env missing";
    } else {
      const db = serverClient();
      const ping = db.from("audits").select("id", { head: true, count: "exact" }).limit(1);
      const result = await Promise.race([
        ping,
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("timeout after 5s")), 5000),
        ),
      ]);
      supabaseLatencyMs = Date.now() - t0;
      const { error } = result as { error: { message: string } | null };
      supabasePing = error ? `error: ${error.message}` : "ok";
    }
  } catch (e) {
    supabaseLatencyMs = Date.now() - t0;
    supabasePing = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  const ok = missing.length === 0 && (supabasePing === "ok" || supabasePing === "skipped: env missing");

  return json(
    {
      ok,
      time: new Date().toISOString(),
      missing,
      env,
      supabasePing,
      supabaseLatencyMs,
      mode: (process.env.USE_MOCK_AI ?? "true").toLowerCase() !== "false" ? "mock-ai" : "live-ai",
      hint: !ok
        ? missing.length > 0
          ? `Fehlende Env-Vars in Vercel setzen: ${missing.join(", ")}. Scope auf "Production, Preview, Development" stellen.`
          : `Supabase nicht erreichbar — prüfe SUPABASE_URL (Tippfehler im Hostname?). Erwartet: https://<projectref>.supabase.co`
        : null,
    },
    { status: ok ? 200 : 503 },
  );
}

/**
 * Maskiert Env-Werte. Zeigt nur Länge und (optional) Host — niemals
 * den vollen Wert.
 */
function maskEnv(v: string | undefined, opts: { showHost?: boolean } = {}): string {
  if (!v || v.length === 0) return "missing";
  if (opts.showHost) {
    try {
      const u = new URL(v);
      return `set (host=${u.host}, len=${v.length})`;
    } catch {
      return `set (invalid-url, len=${v.length})`;
    }
  }
  return `set (len=${v.length})`;
}
