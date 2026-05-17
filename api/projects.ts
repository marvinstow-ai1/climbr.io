// POST /api/projects — atomic create-project (+ optional initial keywords).
// GET  /api/projects — list the caller's projects (handy for the dashboard;
//   the frontend can also read via Supabase + RLS, but this keeps the
//   surface uniform).

import { serverClient } from "../lib/supabase.js";
import { CreateProjectInput, badRequest, json } from "../lib/validation.js";
import { requireAuth } from "../lib/auth.js";
import { safeHandler } from "../lib/safeHandler.js";
import { limitsFor, planLimitError } from "../lib/plans.js";

export const config = { runtime: "nodejs" };

async function _handler(req: Request): Promise<Response> {
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  if (req.method === "GET") {
    const { data, error } = await db
      .from("projects")
      .select("id, domain, gsc_connected, gsc_connected_at, created_at")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false });
    if (error) return json({ error: { message: error.message } }, { status: 500 });
    return json({ projects: data });
  }

  if (req.method !== "POST") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("invalid JSON body"); }
  const parsed = CreateProjectInput.safeParse(body);
  if (!parsed.success) return badRequest("invalid input", parsed.error.flatten());
  const { domain, keywords } = parsed.data;

  // De-duplicate keywords case-insensitively, preserving first-seen order.
  const uniqueKeywords = Array.from(
    new Map(keywords.map((k) => [k.toLowerCase(), k])).values(),
  );

  const planLimit = limitsFor(ctx.plan).keywords;
  if (uniqueKeywords.length > planLimit) {
    return json(
      planLimitError({ resource: "keywords", plan: ctx.plan, current: uniqueKeywords.length, limit: planLimit }),
      { status: 402 },
    );
  }

  // Prevent duplicate (user_id, domain) pairs — friendlier than the eventual
  // unique-constraint violation we'd otherwise raise in a follow-up migration.
  const { data: existing } = await db
    .from("projects")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("domain", domain)
    .maybeSingle();
  if (existing) {
    return json(
      { error: { code: "DUPLICATE_PROJECT", message: "You already have a project for that domain." } },
      { status: 409 },
    );
  }

  const { data: project, error: pErr } = await db
    .from("projects")
    .insert({ user_id: ctx.userId, domain })
    .select("id, domain, gsc_connected, gsc_connected_at, created_at")
    .single();
  if (pErr || !project) {
    return json({ error: { message: pErr?.message ?? "could not create project" } }, { status: 500 });
  }

  let createdKeywords: { id: string; keyword: string }[] = [];
  if (uniqueKeywords.length > 0) {
    const { data: kw, error: kErr } = await db
      .from("keywords")
      .insert(uniqueKeywords.map((k) => ({ project_id: project.id, keyword: k })))
      .select("id, keyword");
    if (kErr) {
      // Best-effort: roll back the project so we don't leave a half-built row.
      await db.from("projects").delete().eq("id", project.id);
      return json({ error: { message: `could not insert keywords: ${kErr.message}` } }, { status: 500 });
    }
    createdKeywords = kw ?? [];
  }

  return json({ project, keywords: createdKeywords }, { status: 201 });
}

export default safeHandler("api/projects", _handler);
