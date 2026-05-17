// GET    /api/seo/tasks?projectId=...    -> list tasks for a project
// POST   /api/seo/tasks                  -> create a task. Either:
//                                            { opportunityId } (templated from opportunity)
//                                            { projectId, title, why, ... } (manual)
// PATCH  /api/seo/tasks?id=...           -> update status: { status: "open"|"in_progress"|"done"|"ignored" }
// DELETE /api/seo/tasks?id=...           -> delete a task

import { serverClient } from "../supabase.js";
import { requireAuth } from "../auth.js";
import { parseRequestUrl } from "../safeHandler.js";
import { json, badRequest } from "../validation.js";
import { taskFromOpportunity } from "../seoTasks.js";

export const config = { runtime: "nodejs" };

const VALID_STATUS = ["open", "in_progress", "done", "ignored"] as const;
const VALID_LANES = ["connect", "discover", "optimize", "publish", "review", "local"] as const;

export async function handle_tasks(req: Request): Promise<Response> {
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  const url = parseRequestUrl(req);

  if (req.method === "GET") {
    const projectId = url.searchParams.get("projectId");
    if (!projectId) return badRequest("projectId required");
    if (!(await ownsProject(db, ctx.userId, projectId))) {
      return json({ error: { message: "forbidden" } }, { status: 403 });
    }
    const { data } = await db
      .from("tasks")
      .select("id, opportunity_id, title, why, expected_impact, effort, suggested_action, status, lane, data, done_at, created_at, updated_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    return json({ tasks: data ?? [] });
  }

  if (req.method === "POST") {
    let body: {
      opportunityId?: string;
      projectId?: string;
      title?: string;
      why?: string;
      expected_impact?: string;
      effort?: string;
      suggested_action?: string;
      lane?: string;
    };
    try { body = (await req.json()) as typeof body; } catch { return badRequest("invalid JSON body"); }

    if (body.opportunityId) {
      return createFromOpportunity(db, ctx.userId, body.opportunityId);
    }
    if (!body.projectId || !body.title) return badRequest("projectId and title required");
    if (!(await ownsProject(db, ctx.userId, body.projectId))) {
      return json({ error: { message: "forbidden" } }, { status: 403 });
    }
    const lane = (body.lane && (VALID_LANES as readonly string[]).includes(body.lane)) ? body.lane : "optimize";
    const effort = body.effort === "low" || body.effort === "high" ? body.effort : "medium";
    const { data, error } = await db
      .from("tasks")
      .insert({
        project_id: body.projectId,
        title: body.title.slice(0, 200),
        why: body.why?.slice(0, 1000) ?? null,
        expected_impact: body.expected_impact?.slice(0, 500) ?? null,
        effort,
        suggested_action: body.suggested_action?.slice(0, 2000) ?? null,
        lane,
      })
      .select("id")
      .single();
    if (error) return json({ error: { message: error.message } }, { status: 500 });
    return json({ id: data.id });
  }

  if (req.method === "PATCH") {
    const id = url.searchParams.get("id");
    if (!id) return badRequest("id required");
    let body: { status?: string };
    try { body = (await req.json()) as typeof body; } catch { return badRequest("invalid JSON body"); }
    if (!body.status || !(VALID_STATUS as readonly string[]).includes(body.status)) {
      return badRequest("status must be one of open|in_progress|done|ignored");
    }
    // Verify ownership through the join.
    const { data: row } = await db
      .from("tasks")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", id)
      .maybeSingle();
    const ownerId = (row as { projects?: { user_id?: string } } | null)?.projects?.user_id;
    if (!row || ownerId !== ctx.userId) {
      return json({ error: { message: "forbidden" } }, { status: 403 });
    }
    const update: Record<string, unknown> = {
      status: body.status,
      updated_at: new Date().toISOString(),
    };
    if (body.status === "done") update.done_at = new Date().toISOString();
    else update.done_at = null;
    const { error } = await db.from("tasks").update(update).eq("id", id);
    if (error) return json({ error: { message: error.message } }, { status: 500 });
    return json({ ok: true });
  }

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return badRequest("id required");
    const { data: row } = await db
      .from("tasks")
      .select("id, projects!inner(user_id)")
      .eq("id", id)
      .maybeSingle();
    const ownerId = (row as { projects?: { user_id?: string } } | null)?.projects?.user_id;
    if (!row || ownerId !== ctx.userId) {
      return json({ error: { message: "forbidden" } }, { status: 403 });
    }
    await db.from("tasks").delete().eq("id", id);
    return json({ ok: true });
  }

  return json({ error: { message: "method not allowed" } }, { status: 405 });
}

async function createFromOpportunity(
  db: ReturnType<typeof serverClient>,
  userId: string,
  opportunityId: string,
): Promise<Response> {
  const { data: op } = await db
    .from("opportunities")
    .select("id, project_id, type, page_url, query, impressions, clicks, position, ctr, data, projects!inner(user_id)")
    .eq("id", opportunityId)
    .maybeSingle();
  const ownerId = (op as { projects?: { user_id?: string } } | null)?.projects?.user_id;
  if (!op || ownerId !== userId) {
    return json({ error: { message: "forbidden" } }, { status: 403 });
  }

  const generated = taskFromOpportunity({
    type: op.type,
    page_url: op.page_url,
    query: op.query,
    impressions: op.impressions,
    clicks: op.clicks,
    position: op.position,
    ctr: op.ctr,
    data: op.data,
  });

  const { data: inserted, error } = await db
    .from("tasks")
    .insert({
      project_id: op.project_id,
      opportunity_id: op.id,
      title: generated.title,
      why: generated.why,
      expected_impact: generated.expected_impact,
      effort: generated.effort,
      suggested_action: generated.suggested_action,
      lane: generated.lane,
      data: {
        opportunity_type: op.type,
        page_url: op.page_url,
        query: op.query,
        impressions: op.impressions,
        clicks: op.clicks,
        position: op.position,
      },
    })
    .select("id")
    .single();
  if (error) return json({ error: { message: error.message } }, { status: 500 });

  await db.from("opportunities").update({ status: "taskified" }).eq("id", op.id);
  return json({ id: inserted.id });
}

async function ownsProject(db: ReturnType<typeof serverClient>, userId: string, projectId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return false;
  const { data } = await db.from("projects").select("user_id").eq("id", projectId).maybeSingle();
  return data?.user_id === userId;
}
