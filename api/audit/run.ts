import { crawlUrl, deriveHeuristicScore } from "../../lib/crawl.js";
import { analyze } from "../../lib/ai.js";
import { serverClient } from "../../lib/supabase.js";
import { RunAuditInput, badRequest, json, serverError, tooMany } from "../../lib/validation.js";
import { clientIp, isOverAnonLimit, logAnonAttempt } from "../../lib/ratelimit.js";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  try {
    return await run(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("audit/run unhandled error", err);
    return serverError(`audit/run crashed: ${message}`);
  }
}

async function run(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: { message: "method not allowed" } }, { status: 405 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid JSON body");
  }

  const parsed = RunAuditInput.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid input", parsed.error.flatten());
  }
  const { url, email, projectId, locale } = parsed.data;

  let db;
  try {
    db = serverClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("audit/run: serverClient init failed", message);
    return serverError(`server misconfigured: ${message}`);
  }
  const ip = clientIp(req);

  // Anonymous requests (no projectId AND no email yet) are IP-rate-limited.
  if (!projectId && !email) {
    if (await isOverAnonLimit(db, ip)) {
      return tooMany("Too many anonymous audits from this IP. Please sign up to continue.");
    }
    await logAnonAttempt(db, ip, url);
  }

  // Create the audit row up front so the client can poll if we want async later.
  const { data: created, error: createErr } = await db
    .from("audits")
    .insert({
      project_id: projectId ?? null,
      capture_email: email ?? null,
      url,
      status: "crawling",
      raw_crawl_json: {},
    })
    .select("id")
    .single();

  if (createErr || !created) {
    console.error("audit insert failed", createErr);
    return serverError(`could not create audit: ${createErr?.message ?? "unknown DB error"}`);
  }
  const auditId = created.id as string;

  try {
    const crawl = await crawlUrl(url);

    await db.from("audits").update({
      status: "analyzing",
      raw_crawl_json: crawl,
    }).eq("id", auditId);

    const report = await analyze({ crawl, locale });
    const score = report.score ?? deriveHeuristicScore(crawl);

    await db.from("audits").update({
      status: "complete",
      ai_report_json: report,
      score,
    }).eq("id", auditId);

    return json({
      auditId,
      status: "complete",
      score,
      // Preview only (3 fixes) for anonymous flow — full report fetched via /api/audit/[id]
      // after email capture / signup.
      preview: {
        summary: report.summary,
        topFixes: report.topFixes.slice(0, 3),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("audit failed", auditId, message);
    await db.from("audits").update({ status: "failed", error: message.slice(0, 500) }).eq("id", auditId);
    return serverError(`audit failed: ${message}`);
  }
}
