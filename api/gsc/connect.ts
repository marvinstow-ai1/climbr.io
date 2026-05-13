import { serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";
import { buildAuthorizeUrl, signState, STATE_TTL_MS } from "../../lib/gsc.js";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return json({ error: { message: "auth required" } }, { status: 401 });
  }
  const token = auth.slice("Bearer ".length);

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return json({ error: { message: "projectId required" } }, { status: 400 });
  }

  const db = serverClient();
  const { data: userRes } = await db.auth.getUser(token);
  const userId = userRes?.user?.id;
  if (!userId) return json({ error: { message: "invalid token" } }, { status: 401 });

  const { data: project } = await db
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.user_id !== userId) {
    return json({ error: { message: "forbidden" } }, { status: 403 });
  }

  try {
    const state = await signState({
      projectId,
      userId,
      exp: Date.now() + STATE_TTL_MS,
    });
    return json({ authorizeUrl: buildAuthorizeUrl(state) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "config error";
    return json({ error: { message: msg } }, { status: 501 });
  }
}
