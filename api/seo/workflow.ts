// GET   /api/seo/workflow?projectId=...   -> current month's step state + counts
// PATCH /api/seo/workflow?projectId=...   { step, status }  -> update a step
//
// Workflow steps are: connect | discover | optimize | publish | review
// "progress" is computed from concrete signals (GSC connected? opportunities
// detected? open tasks?) so the user sees real state, not just toggles.

import { serverClient } from "../../lib/supabase.js";
import { requireAuth } from "../../lib/auth.js";
import { json, badRequest } from "../../lib/validation.js";

export const config = { runtime: "nodejs" };

const STEPS = ["connect", "discover", "optimize", "publish", "review"] as const;
type Step = typeof STEPS[number];

export default async function handler(req: Request): Promise<Response> {
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

  if (req.method === "GET") {
    const [project, steps, opportunities, tasks, latestReport] = await Promise.all([
      db.from("projects").select("gsc_connected").eq("id", projectId).maybeSingle(),
      db.from("workflow_steps").select("step, status, progress, updated_at").eq("project_id", projectId).eq("period", period),
      db.from("opportunities").select("id, status").eq("project_id", projectId),
      db.from("tasks").select("id, status, lane").eq("project_id", projectId),
      db.from("reports").select("id, period, summary, created_at").eq("project_id", projectId).order("period", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const opps = opportunities.data ?? [];
    const taskRows = tasks.data ?? [];
    const openTasks = taskRows.filter((t) => t.status === "open" || t.status === "in_progress").length;
    const doneTasks = taskRows.filter((t) => t.status === "done").length;
    const totalTasks = taskRows.length;
    const completion = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

    const auto: Record<Step, { status: "open" | "in_progress" | "done"; progress: number }> = {
      connect: project.data?.gsc_connected
        ? { status: "done", progress: 100 }
        : { status: "open", progress: 0 },
      discover: opps.length > 0
        ? { status: opps.some((o) => o.status === "open") ? "in_progress" : "done", progress: opps.length > 0 ? 100 : 0 }
        : { status: "open", progress: 0 },
      optimize: totalTasks === 0
        ? { status: "open", progress: 0 }
        : openTasks > 0
          ? { status: "in_progress", progress: completion }
          : { status: "done", progress: 100 },
      publish: doneTasks > 0
        ? { status: "in_progress", progress: Math.min(100, doneTasks * 25) }
        : { status: "open", progress: 0 },
      review: latestReport.data ? { status: "done", progress: 100 } : { status: "open", progress: 0 },
    };

    const manualByStep = new Map<Step, { status: string; progress: number }>();
    for (const r of steps.data ?? []) manualByStep.set(r.step as Step, { status: r.status, progress: r.progress });

    const merged = STEPS.map((step) => {
      const manual = manualByStep.get(step);
      const a = auto[step];
      return {
        step,
        status: manual?.status ?? a.status,
        progress: manual ? Math.max(manual.progress, a.progress) : a.progress,
      };
    });

    return json({
      period,
      steps: merged,
      counts: {
        opportunities: opps.length,
        opportunitiesOpen: opps.filter((o) => o.status === "open").length,
        tasksOpen: openTasks,
        tasksDone: doneTasks,
        tasksTotal: totalTasks,
      },
      latestReport: latestReport.data ?? null,
    });
  }

  if (req.method === "PATCH") {
    let body: { step?: string; status?: string };
    try { body = (await req.json()) as typeof body; } catch { return badRequest("invalid JSON body"); }
    if (!body.step || !(STEPS as readonly string[]).includes(body.step)) return badRequest("invalid step");
    if (!body.status || !["open", "in_progress", "done"].includes(body.status)) return badRequest("invalid status");

    const { error } = await db
      .from("workflow_steps")
      .upsert(
        {
          project_id: projectId,
          period,
          step: body.step,
          status: body.status,
          progress: body.status === "done" ? 100 : body.status === "in_progress" ? 50 : 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,period,step" },
      );
    if (error) return json({ error: { message: error.message } }, { status: 500 });
    return json({ ok: true });
  }

  return json({ error: { message: "method not allowed" } }, { status: 405 });
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function ownsProject(db: ReturnType<typeof serverClient>, userId: string, projectId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return false;
  const { data } = await db.from("projects").select("user_id").eq("id", projectId).maybeSingle();
  return data?.user_id === userId;
}
