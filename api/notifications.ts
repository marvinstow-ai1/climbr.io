import { serverClient } from "../lib/supabase.js";
import { MarkNotificationsSeenInput, badRequest, json } from "../lib/validation.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: { message: "auth required" } }, { status: 401 });
  const token = auth.slice("Bearer ".length);

  const db = serverClient();
  const { data: userRes } = await db.auth.getUser(token);
  const userId = userRes?.user?.id;
  if (!userId) return json({ error: { message: "invalid token" } }, { status: 401 });

  if (req.method === "GET") {
    const { data, error } = await db
      .from("notifications")
      .select("id, project_id, keyword, old_position, new_position, seen, created_at, projects!inner(user_id)")
      .eq("projects.user_id", userId)
      .eq("seen", false)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return json({ error: { message: error.message } }, { status: 500 });
    return json({ notifications: data });
  }

  if (req.method === "POST") {
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("invalid JSON body"); }
    const parsed = MarkNotificationsSeenInput.safeParse(body);
    if (!parsed.success) return badRequest("invalid input", parsed.error.flatten());
    const { error } = await db
      .from("notifications")
      .update({ seen: true })
      .in("id", parsed.data.ids);
    if (error) return json({ error: { message: error.message } }, { status: 500 });
    return json({ ok: true });
  }

  return json({ error: { message: "method not allowed" } }, { status: 405 });
}
