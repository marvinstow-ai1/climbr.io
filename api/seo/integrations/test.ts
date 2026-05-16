// POST /api/seo/integrations/test  { provider: "gsc"|"dataforseo"|"openai" }
// Pings the provider with the user's stored credentials and persists the
// result on the integrations row.

import { decryptToken, serverClient } from "../../../lib/supabase.js";
import { requireAuth } from "../../../lib/auth.js";
import { json, badRequest } from "../../../lib/validation.js";
import { pingServerDataForSeo } from "../../../lib/dataforseo.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  let body: { provider?: string };
  try { body = (await req.json()) as typeof body; } catch { return badRequest("invalid JSON body"); }
  const provider = body.provider;
  if (provider !== "gsc" && provider !== "dataforseo" && provider !== "openai") {
    return badRequest("provider required");
  }

  if (provider === "gsc") {
    const { data: projects } = await db
      .from("projects")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("gsc_connected", true);
    const ok = (projects ?? []).length > 0;
    return json({ ok, message: ok ? "GSC-Verbindung erkannt." : "Keine verbundenen GSC-Properties gefunden." });
  }

  if (provider === "dataforseo") {
    const res = await pingServerDataForSeo();
    if (!res.configured) {
      return json({ ok: false, message: "DataForSEO ist serverseitig nicht konfiguriert." });
    }
    return json({
      ok: res.ok,
      message: res.ok ? "DataForSEO-Verbindung OK." : "DataForSEO antwortet nicht – Server-Zugangsdaten prüfen.",
    });
  }

  // provider === "openai"
  const { data: row } = await db
    .from("integrations")
    .select("credentials_enc")
    .eq("user_id", ctx.userId)
    .eq("provider", provider)
    .maybeSingle();
  if (!row?.credentials_enc) {
    if (process.env.OPENAI_API_KEY) {
      return json({ ok: true, message: "Server-seitiger OpenAI-Key aktiv." });
    }
    return json({ ok: false, message: "Keine Zugangsdaten gespeichert." }, { status: 400 });
  }

  let ok = false;
  let message = "";
  try {
    const plain = await decryptToken(row.credentials_enc);
    const r = await fetch("https://api.openai.com/v1/models", {
      headers: { authorization: `Bearer ${plain}` },
      signal: AbortSignal.timeout(8000),
    });
    ok = r.ok;
    message = ok ? "OpenAI-Verbindung OK." : `OpenAI antwortet mit ${r.status}.`;
  } catch (e) {
    ok = false;
    message = e instanceof Error ? e.message : "Test fehlgeschlagen.";
  }

  await db
    .from("integrations")
    .update({
      status: ok ? "connected" : "error",
      last_tested_at: new Date().toISOString(),
      last_error: ok ? null : message,
    })
    .eq("user_id", ctx.userId)
    .eq("provider", provider);

  return json({ ok, message });
}
