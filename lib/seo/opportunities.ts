// GET  /api/seo/opportunities?projectId=...  -> list opportunities
// POST /api/seo/opportunities  { projectId }  -> re-run detection for a project

import { decryptToken, serverClient } from "../supabase.js";
import { requireAuth } from "../auth.js";
import { json, badRequest } from "../validation.js";
import { detectOpportunities } from "../opportunities.js";

export const config = { runtime: "nodejs" };

export async function handle_opportunities(req: Request): Promise<Response> {
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  const url = new URL(req.url);

  if (req.method === "GET") {
    const projectId = url.searchParams.get("projectId");
    if (!projectId) return badRequest("projectId required");
    if (!(await ownsProject(db, ctx.userId, projectId))) {
      return json({ error: { message: "forbidden" } }, { status: 403 });
    }
    const { data } = await db
      .from("opportunities")
      .select("id, type, page_url, query, impressions, clicks, ctr, position, priority, impact, effort, score, status, data, detected_at")
      .eq("project_id", projectId)
      .order("score", { ascending: false })
      .limit(100);
    return json({ opportunities: data ?? [] });
  }

  if (req.method === "POST") {
    let body: { projectId?: string };
    try { body = (await req.json()) as typeof body; } catch { return badRequest("invalid JSON body"); }
    if (!body.projectId) return badRequest("projectId required");
    if (!(await ownsProject(db, ctx.userId, body.projectId))) {
      return json({ error: { message: "forbidden" } }, { status: 403 });
    }

    const { data: project } = await db
      .from("projects")
      .select("id, gsc_refresh_token_enc, gsc_site_url, gsc_connected")
      .eq("id", body.projectId)
      .maybeSingle();

    let refreshToken: string | null = null;
    if (project?.gsc_refresh_token_enc) {
      try { refreshToken = await decryptToken(project.gsc_refresh_token_enc); } catch { refreshToken = null; }
    }

    let detected;
    try {
      detected = await detectOpportunities({
        refreshToken,
        siteUrl: project?.gsc_site_url ?? null,
      });
    } catch (e) {
      return json(
        { error: { message: e instanceof Error ? e.message : "Detection failed", code: "DETECT_FAILED" } },
        { status: 502 },
      );
    }

    // Replace previous open opportunities with the freshly detected set.
    // Keep dismissed/taskified rows so the user's choices aren't wiped.
    await db.from("opportunities").delete().eq("project_id", body.projectId).eq("status", "open");

    if (detected.length > 0) {
      const rows = detected.map((o) => ({
        project_id: body.projectId!,
        type: o.type,
        page_url: o.page_url,
        query: o.query,
        impressions: o.impressions,
        clicks: o.clicks,
        ctr: o.ctr,
        position: o.position,
        priority: o.priority,
        impact: o.impact,
        effort: o.effort,
        score: o.score,
        data: o.data,
      }));
      const { error } = await db.from("opportunities").insert(rows);
      if (error) return json({ error: { message: error.message } }, { status: 500 });
    }

    return json({ inserted: detected.length, gsc: project?.gsc_connected ?? false });
  }

  return json({ error: { message: "method not allowed" } }, { status: 405 });
}

async function ownsProject(db: ReturnType<typeof serverClient>, userId: string, projectId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return false;
  const { data } = await db.from("projects").select("user_id").eq("id", projectId).maybeSingle();
  return data?.user_id === userId;
}
