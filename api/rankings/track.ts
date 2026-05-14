// POST   /api/rankings/track            — add a keyword to a project
// DELETE /api/rankings/track?id=<kwId>  — remove a keyword
//
// Both check project ownership and (for POST) the per-plan keyword limit.

import { serverClient } from "../../lib/supabase.js";
import { TrackKeywordInput, badRequest, json } from "../../lib/validation.js";
import { requireAuth } from "../../lib/auth.js";
import { limitsFor, planLimitError } from "../../lib/plans.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return json({ error: { message: "id required" } }, { status: 400 });
    }

    // Verify the keyword belongs to a project owned by the caller.
    const { data: kw } = await db
      .from("keywords")
      .select("id, project_id")
      .eq("id", id)
      .maybeSingle();
    if (!kw) return json({ error: { message: "not found" } }, { status: 404 });
    const { data: project } = await db
      .from("projects")
      .select("user_id")
      .eq("id", kw.project_id)
      .maybeSingle();
    if (project?.user_id !== ctx.userId) {
      return json({ error: { message: "not found" } }, { status: 404 });
    }
    const { error } = await db.from("keywords").delete().eq("id", id);
    if (error) return json({ error: { message: error.message } }, { status: 500 });
    return json({ ok: true });
  }

  if (req.method !== "POST") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("invalid JSON body"); }
  const parsed = TrackKeywordInput.safeParse(body);
  if (!parsed.success) return badRequest("invalid input", parsed.error.flatten());
  const { projectId, keyword } = parsed.data;

  const { data: project } = await db
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.user_id !== ctx.userId) {
    return json({ error: { message: "forbidden" } }, { status: 403 });
  }

  const limit = limitsFor(ctx.plan).keywords;
  const { count } = await db
    .from("keywords")
    .select("id", { head: true, count: "exact" })
    .eq("project_id", projectId);
  const current = count ?? 0;
  if (current >= limit) {
    return json(
      planLimitError({ resource: "keywords", plan: ctx.plan, current, limit }),
      { status: 402 },
    );
  }

  const { data, error } = await db
    .from("keywords")
    .insert({ project_id: projectId, keyword: keyword.trim() })
    .select("id, keyword, created_at")
    .single();
  if (error) {
    // Unique-violation on (project_id, keyword) — friendlier message.
    if (error.code === "23505") {
      return json(
        { error: { code: "DUPLICATE_KEYWORD", message: "That keyword is already tracked." } },
        { status: 409 },
      );
    }
    return json({ error: { message: error.message } }, { status: 400 });
  }
  return json(data, { status: 201 });
}
