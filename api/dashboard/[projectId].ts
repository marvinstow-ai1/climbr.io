// GET  /api/dashboard/:projectId            — returns the cached dashboard
//                                              snapshot. If missing or stale
//                                              (> 24h), refreshes via DataForSEO.
// POST /api/dashboard/:projectId?refresh=1   — force-refresh (manual button).
//
// Snapshot includes: organic traffic, traffic trend (30d), top gainers/losers,
// top competing domains, current rankings.

import { serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";
import { requireAuth } from "../../lib/auth.js";
import {
  fetchDomainOverview,
  fetchTopCompetitors,
  fetchDomainPositionForKeyword,
  DataForSeoError,
  type Locale,
} from "../../lib/dataforseo.js";

export const config = { runtime: "nodejs" };

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_SECONDS = 60 * 60 * 24;

interface TrafficPoint { date: string; traffic: number | null }

interface Snapshot {
  organic_traffic: number | null;
  organic_keywords_count: number | null;
  traffic_trend: TrafficPoint[];
  top_gainers: { keyword: string; old_position: number | null; new_position: number | null }[];
  top_losers: { keyword: string; old_position: number | null; new_position: number | null }[];
  competitor_moves: { domain: string; change: number | null }[];
}

export default async function handler(req: Request): Promise<Response> {
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  const url = new URL(req.url);
  // path is /api/dashboard/<id>
  const projectId = url.pathname.split("/").filter(Boolean).pop();
  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return json({ error: { message: "valid projectId required" } }, { status: 400 });
  }

  const { data: project } = await db
    .from("projects")
    .select("id, user_id, domain")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.user_id !== ctx.userId) {
    return json({ error: { message: "not found" } }, { status: 404 });
  }

  const forceRefresh = req.method === "POST" || url.searchParams.get("refresh") === "1";

  if (!forceRefresh) {
    const { data: cached } = await db
      .from("dashboard_snapshots")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (cached && Date.now() - new Date(cached.refreshed_at).getTime() < STALE_AFTER_MS) {
      return json({ snapshot: cached, cached: true });
    }
  }

  try {
    const snapshot = await buildSnapshot(db, project.id, project.domain);
    const { data: saved, error } = await db
      .from("dashboard_snapshots")
      .upsert(
        {
          project_id: projectId,
          ...snapshot,
          refreshed_at: new Date().toISOString(),
        },
        { onConflict: "project_id" },
      )
      .select("*")
      .single();
    if (error) return json({ error: { message: error.message } }, { status: 500 });
    return json({ snapshot: saved, cached: false });
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

async function buildSnapshot(
  db: ReturnType<typeof serverClient>,
  projectId: string,
  domain: string,
): Promise<Snapshot> {
  const locale: Locale = "de"; // TODO: read from user settings when we expose a per-project locale.
  const opts = { db, cacheTtlSeconds: CACHE_TTL_SECONDS };
  const overview = await fetchDomainOverview(domain, locale, opts);
  const competitors = await fetchTopCompetitors(domain, locale, opts);

  // Refresh today's positions for every tracked keyword.
  const { data: kws } = await db
    .from("keywords")
    .select("keyword")
    .eq("project_id", projectId);

  const movements: { keyword: string; old_position: number | null; new_position: number | null; delta: number }[] = [];
  for (const { keyword } of kws ?? []) {
    let pos: number | null = null;
    try {
      pos = await fetchDomainPositionForKeyword(keyword, domain, locale, opts);
    } catch (err) {
      console.error("dashboard: serp fetch failed", projectId, keyword, (err as Error).message);
      continue;
    }
    await db.from("rankings").insert({ project_id: projectId, keyword, position: pos });

    const { data: prev } = await db
      .from("rankings")
      .select("position")
      .eq("project_id", projectId)
      .eq("keyword", keyword)
      .order("recorded_at", { ascending: false })
      .range(1, 1)
      .maybeSingle();
    const prevPos = prev?.position ?? null;
    const delta = pos != null && prevPos != null ? prevPos - pos : 0;
    movements.push({ keyword, old_position: prevPos, new_position: pos, delta });
  }

  movements.sort((a, b) => b.delta - a.delta);
  const top_gainers = movements.filter((m) => m.delta > 0).slice(0, 5);
  const top_losers = movements.filter((m) => m.delta < 0).slice(-5).reverse();

  // Update traffic_history (one row per day).
  const today = new Date().toISOString().slice(0, 10);
  await db.from("traffic_history").upsert(
    {
      project_id: projectId,
      recorded_at: today,
      organic_traffic: overview.organic_traffic,
      organic_keywords_count: overview.organic_keywords_count,
    },
    { onConflict: "project_id,recorded_at" },
  );
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: history } = await db
    .from("traffic_history")
    .select("recorded_at, organic_traffic")
    .eq("project_id", projectId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true });

  const traffic_trend: TrafficPoint[] = (history ?? []).map((r) => ({
    date: r.recorded_at,
    traffic: r.organic_traffic,
  }));

  // Competitor "moves" — simple change vs previous snapshot.
  const { data: prevSnap } = await db
    .from("dashboard_snapshots")
    .select("competitor_moves, refreshed_at")
    .eq("project_id", projectId)
    .maybeSingle();
  const prevByDomain = new Map<string, number | null>();
  if (prevSnap?.competitor_moves && Array.isArray(prevSnap.competitor_moves)) {
    for (const m of prevSnap.competitor_moves as { domain: string; traffic?: number | null }[]) {
      if (m.domain) prevByDomain.set(m.domain, m.traffic ?? null);
    }
  }
  const competitor_moves = competitors.map((c) => {
    const prev = prevByDomain.get(c.domain);
    const change = prev != null && c.organic_traffic != null ? c.organic_traffic - prev : null;
    return { domain: c.domain, change, traffic: c.organic_traffic };
  });

  return {
    organic_traffic: overview.organic_traffic,
    organic_keywords_count: overview.organic_keywords_count,
    traffic_trend,
    top_gainers: top_gainers.map(({ keyword, old_position, new_position }) => ({ keyword, old_position, new_position })),
    top_losers: top_losers.map(({ keyword, old_position, new_position }) => ({ keyword, old_position, new_position })),
    competitor_moves,
  };
}
