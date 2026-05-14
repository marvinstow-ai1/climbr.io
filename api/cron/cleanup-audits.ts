import { serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";

export const config = { runtime: "nodejs" };

export default async function handler(): Promise<Response> {
  const ttlDays = Number(process.env.AUDIT_TTL_DAYS ?? "180");
  const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString();

  const db = serverClient();
  const { error, count } = await db
    .from("audits")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);
  if (error) return json({ error: { message: error.message } }, { status: 500 });

  // Also prune anonymous IP log older than 24h.
  const ipCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db.from("anon_audit_log").delete().lt("created_at", ipCutoff);

  return json({ ok: true, deleted: count ?? 0, ttlDays });
}
