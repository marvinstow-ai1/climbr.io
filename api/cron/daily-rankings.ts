// Daily cron: for each project with GSC connected, fetch positions for each
// tracked keyword from the GSC Search Analytics API and write to `rankings`.
// If position changed by >= 3 positions vs the previous row, create a
// notification.
//
// Phase 1: GSC API call is stubbed (returns null). Wire the real call once
// OAuth callback + token decryption is done.

import { serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";

export const config = { runtime: "edge" };

const POSITION_DELTA = 3;

export default async function handler(req: Request): Promise<Response> {
  // Vercel cron requests include the configured secret. For local testing this
  // header is missing — allow GET when CRON_LOCAL=1.
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }

  const db = serverClient();
  const { data: projects, error: pErr } = await db
    .from("projects")
    .select("id, domain, gsc_connected, gsc_site_url, gsc_refresh_token_enc")
    .eq("gsc_connected", true);
  if (pErr) return json({ error: { message: pErr.message } }, { status: 500 });

  let processed = 0;
  let notifications = 0;

  for (const project of projects ?? []) {
    const { data: kws } = await db
      .from("keywords")
      .select("keyword")
      .eq("project_id", project.id);

    for (const { keyword } of kws ?? []) {
      const position = await fetchGscPosition(project, keyword);
      // Always record (null = not in top 100), so the chart has continuity.
      await db.from("rankings").insert({ project_id: project.id, keyword, position });

      const { data: prev } = await db
        .from("rankings")
        .select("position")
        .eq("project_id", project.id)
        .eq("keyword", keyword)
        .order("recorded_at", { ascending: false })
        .range(1, 1)
        .maybeSingle();

      const prevPos = prev?.position ?? null;
      if (position != null && prevPos != null && Math.abs(position - prevPos) >= POSITION_DELTA) {
        await db.from("notifications").insert({
          project_id: project.id,
          keyword,
          old_position: prevPos,
          new_position: position,
        });
        notifications++;
      }
      processed++;
    }
  }

  return json({ ok: true, processed, notifications });
}

async function fetchGscPosition(
  _project: { gsc_site_url: string | null; gsc_refresh_token_enc: string | null },
  _keyword: string,
): Promise<number | null> {
  // TODO Phase 1.5: decrypt refresh token, exchange for access token via
  // https://oauth2.googleapis.com/token, then POST to
  // https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
  // with body { startDate, endDate, dimensions: ["query"], rowLimit: 1, dimensionFilterGroups: [{filters:[{dimension:"query",expression:_keyword}]}] }
  // and return data.rows[0].position (rounded).
  return null;
}
