// POST /api/keywords/research — run a keyword research lookup via DataForSEO.
// GET  /api/keywords/research — list the caller's previous lookups.

import { serverClient } from "../../lib/supabase.js";
import { KeywordResearchInput, badRequest, json } from "../../lib/validation.js";
import { requireAuth } from "../../lib/auth.js";
import { limitsFor, monthlyCount, planLimitError } from "../../lib/plans.js";
import { isOverHourlyLimit } from "../../lib/ratelimit.js";
import {
  fetchKeywordMetrics,
  fetchRelatedKeywords,
  fetchSerpResults,
  DataForSeoError,
} from "../../lib/dataforseo.js";

export const config = { runtime: "nodejs" };

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h
const HOURLY_LIMIT_PER_USER = 30;

export default async function handler(req: Request): Promise<Response> {
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  if (req.method === "GET") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) {
      const { data, error } = await db
        .from("keyword_research")
        .select("*")
        .eq("id", id)
        .eq("user_id", ctx.userId)
        .maybeSingle();
      if (error) return json({ error: { message: error.message } }, { status: 500 });
      if (!data) return json({ error: { message: "not found" } }, { status: 404 });
      return json({ research: data });
    }
    const { data, error } = await db
      .from("keyword_research")
      .select("id, keyword, locale:language_code, search_volume, cpc, keyword_difficulty, created_at")
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
  const parsed = KeywordResearchInput.safeParse(body);
  if (!parsed.success) return badRequest("invalid input", parsed.error.flatten());
  const { keyword, locale } = parsed.data;

  const monthlyLimit = limitsFor(ctx.plan).keywordResearchPerMonth;
  const monthlyUsed = await monthlyCount(db as never, "keyword_research", ctx.userId);
  if (monthlyUsed >= monthlyLimit) {
    return json(
      planLimitError({ resource: "keyword_research", plan: ctx.plan, current: monthlyUsed, limit: monthlyLimit }),
      { status: 402 },
    );
  }
  const hourly = await isOverHourlyLimit(db, "keyword_research", ctx.userId, HOURLY_LIMIT_PER_USER);
  if (hourly.over) {
    return json(
      { error: { code: "RATE_LIMITED", message: `Too many requests — wait a few minutes (max ${HOURLY_LIMIT_PER_USER}/hour).` } },
      { status: 429 },
    );
  }

  try {
    const [metrics, related, serp] = await Promise.all([
      fetchKeywordMetrics([keyword], locale, { db, cacheTtlSeconds: CACHE_TTL_SECONDS }),
      fetchRelatedKeywords(keyword, locale, { db, cacheTtlSeconds: CACHE_TTL_SECONDS }),
      fetchSerpResults(keyword, locale, { db, cacheTtlSeconds: CACHE_TTL_SECONDS }),
    ]);
    const primary = metrics[0] ?? null;

    const { data, error } = await db
      .from("keyword_research")
      .insert({
        user_id: ctx.userId,
        keyword,
        location_code: locale === "de" ? 2276 : 2840,
        language_code: locale,
        search_volume: primary?.search_volume ?? null,
        cpc: primary?.cpc ?? null,
        competition: primary?.competition ?? null,
        keyword_difficulty: primary?.keyword_difficulty ?? null,
        serp_top10: serp,
        related_keywords: related,
      })
      .select("id")
      .single();
    if (error) return json({ error: { message: error.message } }, { status: 500 });

    return json({
      id: data.id,
      keyword,
      locale,
      metrics: primary,
      serp,
      related,
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
