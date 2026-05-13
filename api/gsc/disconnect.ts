// Disconnect a project from GSC. Best-effort revocation against Google's
// revoke endpoint, followed by hard-delete of the encrypted refresh token
// row. Used for rotation/revoke flows.

import { decryptToken, serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: { message: "method not allowed" } }, { status: 405 });

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: { message: "auth required" } }, { status: 401 });
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
    .select("id, user_id, gsc_refresh_token_enc")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.user_id !== userId) {
    return json({ error: { message: "forbidden" } }, { status: 403 });
  }

  // Best-effort revoke. Failure here doesn't block local clearing.
  if (project.gsc_refresh_token_enc) {
    try {
      const refresh = await decryptToken(project.gsc_refresh_token_enc);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refresh)}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      });
    } catch {
      // ignore
    }
  }

  await db
    .from("projects")
    .update({
      gsc_connected: false,
      gsc_connected_at: null,
      gsc_refresh_token_enc: null,
      gsc_site_url: null,
      gsc_property_uri: null,
    })
    .eq("id", project.id);

  return json({ ok: true });
}
