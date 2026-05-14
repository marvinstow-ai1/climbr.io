// Daily cron: refresh each project's dashboard_snapshot via DataForSEO so the
// next time a user opens the dashboard the data is fresh AND the snapshot is
// the canonical "yesterday" comparison point for gainers/losers.

import { serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";
import {
  fetchDomainOverview,
  fetchTopCompetitors,
  fetchDomainPositionForKeyword,
  DataForSeoError,
} from "../../lib/dataforseo.js";

export const config = { runtime: "nodejs" };
const CACHE_TTL_SECONDS = 60 * 60 * 12;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }
  const db = serverClient();
  const { data: projects } = await db.from("projects").select("id, domain");
  let refreshed = 0;
  let failed = 0;

  for (const project of projects ?? []) {
    try {
      const opts = { db, cacheTtlSeconds: CACHE_TTL_SECONDS };
      const overview = await fetchDomainOverview(project.domain, "de", opts);
      const competitors = await fetchTopCompetitors(project.domain, "de", opts);

      const { data: kws } = await db.from("keywords").select("keyword").eq("project_id", project.id);
      const moves: { keyword: string; old_position: number | null; new_position: number | null; delta: number }[] = [];
      for (const { keyword } of kws ?? []) {
        let pos: number | null = null;
        try {
          pos = await fetchDomainPositionForKeyword(keyword, project.domain, "de", opts);
        } catch (err) {
          console.warn("refresh-dashboards: pos fetch failed", project.id, keyword, (err as Error).message);
          continue;
        }
        const { data: prev } = await db
          .from("rankings")
          .select("position")
          .eq("project_id", project.id)
          .eq("keyword", keyword)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const prevPos = prev?.position ?? null;
        moves.push({
          keyword,
          old_position: prevPos,
          new_position: pos,
          delta: pos != null && prevPos != null ? prevPos - pos : 0,
        });
      }
      moves.sort((a, b) => b.delta - a.delta);

      const today = new Date().toISOString().slice(0, 10);
      await db.from("traffic_history").upsert(
        {
          project_id: project.id,
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
        .eq("project_id", project.id)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true });

      await db.from("dashboard_snapshots").upsert(
        {
          project_id: project.id,
          organic_traffic: overview.organic_traffic,
          organic_keywords_count: overview.organic_keywords_count,
          traffic_trend: (history ?? []).map((r) => ({ date: r.recorded_at, traffic: r.organic_traffic })),
          top_gainers: moves.filter((m) => m.delta > 0).slice(0, 5).map(({ keyword, old_position, new_position }) => ({ keyword, old_position, new_position })),
          top_losers: moves.filter((m) => m.delta < 0).slice(-5).reverse().map(({ keyword, old_position, new_position }) => ({ keyword, old_position, new_position })),
          competitor_moves: competitors.map((c) => ({ domain: c.domain, change: null, traffic: c.organic_traffic })),
          refreshed_at: new Date().toISOString(),
        },
        { onConflict: "project_id" },
      );
      refreshed++;
    } catch (err) {
      failed++;
      if (err instanceof DataForSeoError) {
        console.warn("refresh-dashboards: dataforseo error", project.id, err.message);
      } else {
        console.error("refresh-dashboards: failed", project.id, (err as Error).message);
      }
    }
  }

  return json({ ok: true, refreshed, failed });
}
