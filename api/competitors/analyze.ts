// POST /api/competitors/analyze — run competitor analysis (single or compare).
// GET  /api/competitors/analyze — list the caller's saved analyses.
// GET  /api/competitors/analyze?id=... — load a specific analysis.

import { serverClient } from "../../lib/supabase.js";
import { CompetitorAnalysisInput, badRequest, json } from "../../lib/validation.js";
import { requireAuth } from "../../lib/auth.js";
import {
  fetchDomainOverview,
  fetchDomainKeywords,
  fetchTopCompetitors,
  fetchBacklinksSummary,
  DataForSeoError,
} from "../../lib/dataforseo.js";

export const config = { runtime: "nodejs" };

const CACHE_TTL_SECONDS = 60 * 60 * 24;

async function snapshotFor(domain: string, locale: "en" | "de", db: ReturnType<typeof serverClient>) {
  const opts = { db, cacheTtlSeconds: CACHE_TTL_SECONDS };
  const [overview, keywords, competitors, backlinks] = await Promise.all([
    fetchDomainOverview(domain, locale, opts),
    fetchDomainKeywords(domain, locale, opts),
    fetchTopCompetitors(domain, locale, opts),
    fetchBacklinksSummary(domain, opts),
  ]);
  return { domain, overview, keywords, competitors, backlinks };
}

export default async function handler(req: Request): Promise<Response> {
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  if (req.method === "GET") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) {
      const { data, error } = await db
        .from("competitor_analysis")
        .select("*")
        .eq("id", id)
        .eq("user_id", ctx.userId)
        .maybeSingle();
      if (error) return json({ error: { message: error.message } }, { status: 500 });
      if (!data) return json({ error: { message: "not found" } }, { status: 404 });
      return json({ analysis: data });
    }
    const { data, error } = await db
      .from("competitor_analysis")
      .select("id, domain, compare_domain, organic_traffic, organic_keywords_count, backlinks_count, created_at")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return json({ error: { message: error.message } }, { status: 500 });
    return json({ items: data ?? [] });
  }

  if (req.method !== "POST") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("invalid JSON body"); }
  const parsed = CompetitorAnalysisInput.safeParse(body);
  if (!parsed.success) return badRequest("invalid input", parsed.error.flatten());
  const { domain, compareDomain, locale } = parsed.data;

  try {
    const primary = await snapshotFor(domain, locale, db);
    const compare = compareDomain ? await snapshotFor(compareDomain, locale, db) : null;

    const { data, error } = await db
      .from("competitor_analysis")
      .insert({
        user_id: ctx.userId,
        domain,
        compare_domain: compareDomain ?? null,
        location_code: locale === "de" ? 2276 : 2840,
        language_code: locale,
        organic_keywords_count: primary.overview.organic_keywords_count,
        organic_traffic: primary.overview.organic_traffic,
        paid_traffic: primary.overview.paid_traffic,
        backlinks_count: primary.backlinks.backlinks,
        referring_domains: primary.backlinks.referring_domains,
        top_keywords: primary.keywords,
        top_competitors: primary.competitors,
        compare_snapshot: compare,
      })
      .select("id")
      .single();
    if (error) return json({ error: { message: error.message } }, { status: 500 });

    return json({
      id: data.id,
      locale,
      primary,
      compare,
    });
  } catch (err) {
    if (err instanceof DataForSeoError) {
      return json(
        { error: { code: err.code, message: err.message } },
        { status: err.code === "MISSING_CREDENTIALS" ? 500 : 502 },
      );
    }
    return json({ error: { message: (err as Error).message } }, { status: 500 });
  }
}
