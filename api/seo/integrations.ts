// SEO data-connections API.
//
// GET    /api/seo/integrations              -> status for GSC, DataForSEO, OpenAI
// POST   /api/seo/integrations              -> save credentials   { provider, credentials }
// DELETE /api/seo/integrations?provider=... -> disconnect provider
//
// Connection-testing happens in `./integrations/test.ts`.
// GSC status is derived from the projects table (per-project OAuth).
// DataForSEO + OpenAI live in the per-user integrations table.

import { serverClient, encryptToken } from "../../lib/supabase.js";
import { requireAuth } from "../../lib/auth.js";
import { json, badRequest } from "../../lib/validation.js";

export const config = { runtime: "nodejs" };

export type Provider = "gsc" | "dataforseo" | "openai";

interface IntegrationStatus {
  provider: Provider;
  status: "connected" | "disconnected" | "error";
  last_tested_at: string | null;
  last_error: string | null;
  meta?: Record<string, unknown>;
}

export default async function handler(req: Request): Promise<Response> {
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  const url = new URL(req.url);

  if (req.method === "GET") {
    return getStatuses(ctx.userId, db);
  }

  if (req.method === "POST") {
    return saveCredentials(req, ctx.userId, db);
  }

  if (req.method === "DELETE") {
    const provider = url.searchParams.get("provider");
    if (!provider || !isProvider(provider)) return badRequest("provider required");
    if (provider === "gsc") {
      return json(
        { error: { message: "GSC wird pro Projekt verbunden – nutze Einstellungen oder das Dashboard." } },
        { status: 400 },
      );
    }
    await db.from("integrations").delete().eq("user_id", ctx.userId).eq("provider", provider);
    return json({ ok: true });
  }

  return json({ error: { message: "method not allowed" } }, { status: 405 });
}

async function getStatuses(userId: string, db: ReturnType<typeof serverClient>): Promise<Response> {
  const [integrations, gscProjects] = await Promise.all([
    db.from("integrations").select("provider, status, last_tested_at, last_error, meta").eq("user_id", userId),
    db.from("projects").select("id, domain, gsc_connected, gsc_connected_at").eq("user_id", userId),
  ]);

  const connectedGsc = (gscProjects.data ?? []).filter((p) => p.gsc_connected);
  const statuses: IntegrationStatus[] = [];

  statuses.push({
    provider: "gsc",
    status: connectedGsc.length > 0 ? "connected" : "disconnected",
    last_tested_at: connectedGsc[0]?.gsc_connected_at ?? null,
    last_error: null,
    meta: { connectedProjects: connectedGsc.length },
  });

  for (const provider of ["dataforseo", "openai"] as const) {
    const row = (integrations.data ?? []).find((r) => r.provider === provider);
    statuses.push({
      provider,
      status: (row?.status as IntegrationStatus["status"]) ?? "disconnected",
      last_tested_at: row?.last_tested_at ?? null,
      last_error: row?.last_error ?? null,
      meta: row?.meta ?? {},
    });
  }

  // OpenAI server-key fallback: if the server has OPENAI_API_KEY set and the
  // user hasn't configured their own, surface it as "connected (server-side)".
  if (!statuses.find((s) => s.provider === "openai" && s.status === "connected") && process.env.OPENAI_API_KEY) {
    const idx = statuses.findIndex((s) => s.provider === "openai");
    statuses[idx] = {
      provider: "openai",
      status: "connected",
      last_tested_at: null,
      last_error: null,
      meta: { source: "server" },
    };
  }

  return json({ integrations: statuses });
}

async function saveCredentials(req: Request, userId: string, db: ReturnType<typeof serverClient>): Promise<Response> {
  let body: { provider?: string; credentials?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest("invalid JSON body");
  }
  if (!body.provider || !isProvider(body.provider)) return badRequest("provider must be 'dataforseo' or 'openai'");
  if (body.provider === "gsc") return badRequest("GSC wird pro Projekt verbunden");
  if (!body.credentials || body.credentials.length < 8 || body.credentials.length > 4096) {
    return badRequest("credentials missing or invalid");
  }

  // For DataForSEO we expect "login:password"; for OpenAI we expect a key.
  if (body.provider === "dataforseo" && !body.credentials.includes(":")) {
    return badRequest("DataForSEO erwartet das Format login:password");
  }
  if (body.provider === "openai" && !body.credentials.startsWith("sk-")) {
    return badRequest("OpenAI API-Key beginnt mit sk-");
  }

  const enc = await encryptToken(body.credentials);
  const now = new Date().toISOString();
  const { error } = await db
    .from("integrations")
    .upsert(
      {
        user_id: userId,
        provider: body.provider,
        status: "connected",
        credentials_enc: enc,
        last_tested_at: null,
        last_error: null,
        updated_at: now,
      },
      { onConflict: "user_id,provider" },
    );
  if (error) return json({ error: { message: error.message } }, { status: 500 });
  return json({ ok: true });
}

export function isProvider(s: string): s is Provider {
  return s === "gsc" || s === "dataforseo" || s === "openai";
}
