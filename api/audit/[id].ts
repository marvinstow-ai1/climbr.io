import { serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return json({ error: { message: "method not allowed" } }, { status: 405 });

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return json({ error: { message: "invalid id" } }, { status: 400 });
  }

  // Caller may be:
  //  - Authenticated user (Authorization: Bearer <jwt>) — RLS enforced via project ownership.
  //  - Anonymous with the capture_email matching ?email=... — used right after the email-capture modal.
  // For MVP we use the service-role client and check ownership in-code so anonymous email lookups work.
  const db = serverClient();
  const { data, error } = await db
    .from("audits")
    .select("id, project_id, url, status, score, raw_crawl_json, ai_report_json, capture_email, created_at, error")
    .eq("id", id)
    .maybeSingle();

  if (error) return json({ error: { message: error.message } }, { status: 500 });
  if (!data) return json({ error: { message: "not found" } }, { status: 404 });

  // Access control: project audits require auth claim matching the owner;
  // anonymous audits require the email query param to match capture_email.
  if (data.project_id) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: { message: "auth required" } }, { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length);
    const { data: userRes } = await db.auth.getUser(token);
    const userId = userRes?.user?.id;
    if (!userId) return json({ error: { message: "invalid token" } }, { status: 401 });

    const { data: project } = await db
      .from("projects")
      .select("user_id")
      .eq("id", data.project_id)
      .maybeSingle();
    if (!project || project.user_id !== userId) {
      return json({ error: { message: "forbidden" } }, { status: 403 });
    }
  } else {
    const email = url.searchParams.get("email");
    if (!email || email.toLowerCase() !== (data.capture_email ?? "").toLowerCase()) {
      return json({ error: { message: "email required" } }, { status: 401 });
    }
  }

  return json(data);
}
