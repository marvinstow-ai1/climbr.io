// GET  /api/seo/briefs?projectId=...  -> list briefs
// POST /api/seo/briefs  { projectId, keyword, pageUrl? }  -> generate + persist a brief

import { decryptToken, serverClient } from "../supabase.js";
import { requireAuth } from "../auth.js";
import { json, badRequest } from "../validation.js";
import { generateBrief } from "../briefs.js";
import { keywordIdeas } from "../dataforseo.js";

export const config = { runtime: "nodejs" };

export async function handle_briefs(req: Request): Promise<Response> {
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  const url = new URL(req.url);

  if (req.method === "GET") {
    const projectId = url.searchParams.get("projectId");
    if (!projectId) return badRequest("projectId required");
    if (!(await ownsProject(db, ctx.userId, projectId))) {
      return json({ error: { message: "forbidden" } }, { status: 403 });
    }
    const { data } = await db
      .from("briefs")
      .select("id, keyword, page_url, intent, brief, model, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    return json({ briefs: data ?? [] });
  }

  if (req.method === "POST") {
    let body: { projectId?: string; keyword?: string; pageUrl?: string };
    try { body = (await req.json()) as typeof body; } catch { return badRequest("invalid JSON body"); }
    if (!body.projectId || !body.keyword) return badRequest("projectId and keyword required");
    if (body.keyword.length < 2 || body.keyword.length > 120) return badRequest("keyword length out of range");
    if (!(await ownsProject(db, ctx.userId, body.projectId))) {
      return json({ error: { message: "forbidden" } }, { status: 403 });
    }

    // Pull related keywords from DataForSEO (server-side credentials only).
    let related: { keyword: string; searchVolume?: number | null }[] = [];
    try {
      const ideas = await keywordIdeas(body.keyword, "de");
      related = ideas.slice(0, 8).map((k) => ({ keyword: k.keyword, searchVolume: k.searchVolume }));
    } catch {
      related = [];
    }

    // User's OpenAI key takes precedence over server env.
    const { data: openaiRow } = await db
      .from("integrations")
      .select("credentials_enc")
      .eq("user_id", ctx.userId)
      .eq("provider", "openai")
      .maybeSingle();
    let userOpenAi: string | null = null;
    if (openaiRow?.credentials_enc) {
      try { userOpenAi = await decryptToken(openaiRow.credentials_enc); } catch { userOpenAi = null; }
    }

    const brief = await generateBrief({
      keyword: body.keyword,
      pageUrl: body.pageUrl ?? null,
      context: { relatedKeywords: related },
      apiKey: userOpenAi,
      locale: "de",
    });

    const { data: inserted, error } = await db
      .from("briefs")
      .insert({
        project_id: body.projectId,
        keyword: brief.keyword,
        page_url: body.pageUrl ?? null,
        intent: brief.intent,
        brief,
        model: brief.model,
      })
      .select("id, keyword, page_url, intent, brief, model, created_at")
      .single();
    if (error) return json({ error: { message: error.message } }, { status: 500 });
    return json({ brief: inserted });
  }

  return json({ error: { message: "method not allowed" } }, { status: 405 });
}

async function ownsProject(db: ReturnType<typeof serverClient>, userId: string, projectId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return false;
  const { data } = await db.from("projects").select("user_id").eq("id", projectId).maybeSingle();
  return data?.user_id === userId;
}
