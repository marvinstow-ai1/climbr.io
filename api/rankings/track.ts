import { serverClient } from "../../lib/supabase.js";
import { TrackKeywordInput, badRequest, json, tooMany } from "../../lib/validation.js";

export const config = { runtime: "edge" };

const FREE_LIMIT = Number(process.env.FREE_TRACKED_KEYWORDS ?? "5");

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: { message: "method not allowed" } }, { status: 405 });

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: { message: "auth required" } }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid JSON body");
  }
  const parsed = TrackKeywordInput.safeParse(body);
  if (!parsed.success) return badRequest("invalid input", parsed.error.flatten());

  const db = serverClient();
  const { data: userRes } = await db.auth.getUser(token);
  const userId = userRes?.user?.id;
  if (!userId) return json({ error: { message: "invalid token" } }, { status: 401 });

  const { projectId, keyword } = parsed.data;

  const { data: project } = await db
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.user_id !== userId) {
    return json({ error: { message: "forbidden" } }, { status: 403 });
  }

  const { count } = await db
    .from("keywords")
    .select("id", { head: true, count: "exact" })
    .eq("project_id", projectId);
  if ((count ?? 0) >= FREE_LIMIT) {
    return tooMany(`Free plan tracks up to ${FREE_LIMIT} keywords.`);
  }

  const { data, error } = await db
    .from("keywords")
    .insert({ project_id: projectId, keyword })
    .select("id, keyword, created_at")
    .single();
  if (error) return json({ error: { message: error.message } }, { status: 400 });
  return json(data);
}
