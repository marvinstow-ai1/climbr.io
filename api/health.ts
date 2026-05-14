import { serverClient } from "../lib/supabase.js";
import { json } from "../lib/validation.js";

export const config = { runtime: "nodejs" };

export default async function handler(): Promise<Response> {
  const checks: Record<string, unknown> = {
    ok: true,
    time: new Date().toISOString(),
    mode: (process.env.USE_MOCK_AI ?? "true").toLowerCase() !== "false" ? "mock-ai" : "live-ai",
  };

  try {
    const db = serverClient();
    const { error } = await db.from("audits").select("id", { head: true, count: "exact" }).limit(1);
    checks.db = error ? `error: ${error.message}` : "ok";
  } catch (e) {
    checks.ok = false;
    checks.db = e instanceof Error ? e.message : "unknown";
  }

  return json(checks, { status: checks.ok ? 200 : 503 });
}
