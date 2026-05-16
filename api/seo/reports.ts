// GET /api/seo/reports?projectId=...  -> aggregated progress report for the
// current month: clicks, impressions, CTR, avg position, task completion,
// changes since the last report (where data is available). Computes
// on-the-fly from rankings + tasks, then persists for trend comparisons.

import { decryptToken, serverClient } from "../../lib/supabase.js";
import { requireAuth } from "../../lib/auth.js";
import { json, badRequest } from "../../lib/validation.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) return badRequest("projectId required");
  if (!(await ownsProject(db, ctx.userId, projectId))) {
    return json({ error: { message: "forbidden" } }, { status: 403 });
  }

  const period = currentPeriod();

  const [rankings, tasks, prevReport, project] = await Promise.all([
    db.from("rankings").select("keyword, position, recorded_at").eq("project_id", projectId).order("recorded_at", { ascending: false }).limit(500),
    db.from("tasks").select("id, status, lane, done_at, created_at").eq("project_id", projectId),
    db.from("reports").select("metrics").eq("project_id", projectId).order("period", { ascending: false }).limit(1).maybeSingle(),
    db.from("projects").select("gsc_refresh_token_enc, gsc_site_url, domain").eq("id", projectId).maybeSingle(),
  ]);

  const taskRows = tasks.data ?? [];
  const tasksDone = taskRows.filter((t) => t.status === "done").length;
  const tasksOpen = taskRows.filter((t) => t.status === "open" || t.status === "in_progress").length;

  // Compute keyword movement (latest vs ~30d prior) from rankings table.
  const rankingRows = rankings.data ?? [];
  const byKeyword = new Map<string, { latest: number | null; previous: number | null }>();
  for (const r of rankingRows) {
    const e = byKeyword.get(r.keyword) ?? { latest: null, previous: null };
    if (e.latest == null) e.latest = r.position;
    else if (e.previous == null) e.previous = r.position;
    byKeyword.set(r.keyword, e);
  }
  let improved = 0;
  let declined = 0;
  for (const { latest, previous } of byKeyword.values()) {
    if (latest == null || previous == null) continue;
    if (latest < previous) improved++;
    else if (latest > previous) declined++;
  }

  // Fetch fresh GSC totals for the past 28d if connected (so the user sees
  // real clicks / impressions / CTR / avg position numbers).
  const totals = await fetchGscTotals(project.data, "current");
  const totalsPrev = await fetchGscTotals(project.data, "previous");

  const metrics = {
    clicks: totals?.clicks ?? null,
    impressions: totals?.impressions ?? null,
    ctr: totals?.ctr ?? null,
    avgPosition: totals?.position ?? null,
    keywordImproved: improved,
    keywordDeclined: declined,
    tasksDone,
    tasksOpen,
    tasksTotal: taskRows.length,
    completionRate: taskRows.length === 0 ? 0 : Math.round((tasksDone / taskRows.length) * 100),
    delta: totalsPrev ? {
      clicks: totals && totalsPrev ? totals.clicks - totalsPrev.clicks : null,
      impressions: totals && totalsPrev ? totals.impressions - totalsPrev.impressions : null,
    } : null,
  };

  const summary = renderSummary(metrics, project.data?.domain ?? "Projekt");

  // Persist (best-effort) — useful for trend over time. Don't fail the
  // response if the upsert fails.
  await db
    .from("reports")
    .upsert(
      { project_id: projectId, period, metrics, summary },
      { onConflict: "project_id,period" },
    );

  return json({ period, metrics, summary, previous: prevReport.data?.metrics ?? null });
}

interface GscTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

async function fetchGscTotals(
  project: { gsc_refresh_token_enc: string | null; gsc_site_url: string | null } | null,
  window: "current" | "previous",
): Promise<GscTotals | null> {
  if (!project?.gsc_refresh_token_enc || !project.gsc_site_url) return null;
  if ((process.env.MOCK_GSC ?? "").toLowerCase() === "true") return mockTotals(window);
  try {
    const { refreshAccessToken } = await import("../../lib/gsc.js");
    const refresh = await decryptToken(project.gsc_refresh_token_enc);
    const { accessToken } = await refreshAccessToken(refresh);
    const now = new Date();
    const offsetDays = window === "current" ? 0 : 28;
    const end = isoDate(addDays(now, -2 - offsetDays));
    const start = isoDate(addDays(now, -2 - offsetDays - 28));
    const r = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(project.gsc_site_url)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ startDate: start, endDate: end }),
      },
    );
    if (!r.ok) return null;
    const data = (await r.json()) as { rows?: { clicks: number; impressions: number; ctr: number; position: number }[] };
    const row = data.rows?.[0];
    if (!row) return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    return row;
  } catch {
    return null;
  }
}

function mockTotals(window: "current" | "previous"): GscTotals {
  if (window === "current") return { clicks: 612, impressions: 18540, ctr: 0.033, position: 14.2 };
  return { clicks: 487, impressions: 16210, ctr: 0.030, position: 16.1 };
}

interface ReportMetrics {
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  avgPosition: number | null;
  keywordImproved: number;
  keywordDeclined: number;
  tasksDone: number;
  tasksOpen: number;
  tasksTotal: number;
  completionRate: number;
  delta: { clicks: number | null; impressions: number | null } | null;
}

function renderSummary(m: ReportMetrics, name: string): string {
  const parts: string[] = [];
  parts.push(`Stand für ${name} im aktuellen Monat:`);
  if (m.clicks != null && m.impressions != null) {
    parts.push(`Du hast ${m.clicks.toLocaleString("de-DE")} Klicks bei ${m.impressions.toLocaleString("de-DE")} Impressionen erzielt.`);
  }
  if (m.ctr != null) parts.push(`Die durchschnittliche Klickrate liegt bei ${(m.ctr * 100).toFixed(1)}%.`);
  if (m.avgPosition != null) parts.push(`Die durchschnittliche Position ist ${m.avgPosition.toFixed(1)}.`);
  if (m.delta?.clicks != null) {
    const sign = m.delta.clicks >= 0 ? "+" : "";
    parts.push(`Im Vergleich zum Vormonat: ${sign}${m.delta.clicks.toLocaleString("de-DE")} Klicks.`);
  }
  if (m.tasksTotal > 0) {
    parts.push(`${m.tasksDone} von ${m.tasksTotal} SEO-Aufgaben abgeschlossen (${m.completionRate}%).`);
  } else {
    parts.push("Noch keine SEO-Aufgaben angelegt – starte mit dem Opportunity-Finder.");
  }
  if (m.keywordImproved > 0) parts.push(`${m.keywordImproved} Keywords haben sich verbessert.`);
  return parts.join(" ");
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + days);
  return c;
}
function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

async function ownsProject(db: ReturnType<typeof serverClient>, userId: string, projectId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return false;
  const { data } = await db.from("projects").select("user_id").eq("id", projectId).maybeSingle();
  return data?.user_id === userId;
}
