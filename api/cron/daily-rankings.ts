// Daily cron: for each project with GSC connected, fetch positions for each
// tracked keyword from the GSC Search Analytics API and write to `rankings`.
// If position changed by >= 3 positions vs the previous row, create a
// notification. Failures for one keyword/project don't fail the whole job.

import { decryptToken, serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";
import { safeHandler } from "../../lib/safeHandler.js";
import { fetchGscPosition } from "../../lib/gsc.js";

export const config = { runtime: "nodejs" };

const POSITION_DELTA = 3;

async function _handler(req: Request): Promise<Response> {
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
    if (!project.gsc_refresh_token_enc || !project.gsc_site_url) continue;

    let refreshToken: string;
    try {
      refreshToken = await decryptToken(project.gsc_refresh_token_enc);
    } catch (err) {
      console.error("cron: failed to decrypt token for project", project.id, (err as Error).message);
      continue;
    }

    const { data: kws } = await db
      .from("keywords")
      .select("keyword")
      .eq("project_id", project.id);

    for (const { keyword } of kws ?? []) {
      let position: number | null = null;
      try {
        position = await fetchGscPosition({
          refreshToken,
          siteUrl: project.gsc_site_url,
          keyword,
        });
      } catch (err) {
        // Log without the token. Skip this keyword for today.
        console.error("cron: gsc fetch failed", project.id, keyword, (err as Error).message);
        continue;
      }
      // Always record (null = not in top 100), so the chart has continuity.
      const { error: insErr } = await db
        .from("rankings")
        .insert({ project_id: project.id, keyword, position });
      if (insErr) {
        console.error("cron: rankings insert failed", project.id, keyword, insErr.message);
        continue;
      }

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
        const { error: notifErr } = await db.from("notifications").insert({
          project_id: project.id,
          keyword,
          old_position: prevPos,
          new_position: position,
        });
        if (notifErr) {
          console.error("cron: notification insert failed", project.id, keyword, notifErr.message);
        } else {
          notifications++;
        }
      }
      processed++;
    }
  }

  // Nightly maintenance: prune old audits + anonymous IP log. Folded in
  // here to stay under Vercel's 12-function Hobby limit.
  const ttlDays = Number(process.env.AUDIT_TTL_DAYS ?? "180");
  const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString();
  const { count: prunedAudits } = await db
    .from("audits")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  const ipCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db.from("anon_audit_log").delete().lt("created_at", ipCutoff);

  return json({ ok: true, processed, notifications, prunedAudits: prunedAudits ?? 0 });
}

export default safeHandler("api/cron/daily-rankings", _handler);

