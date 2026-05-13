import type { SupabaseClient } from "@supabase/supabase-js";

const LIMIT = Number(process.env.ANON_AUDITS_PER_IP_PER_HOUR ?? "5");

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

// Logs the attempt and returns true if the caller is over the limit.
export async function isOverAnonLimit(db: SupabaseClient, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from("anon_audit_log")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);
  if (error) {
    console.warn("ratelimit lookup failed", error.message);
    return false; // fail open — don't block real users on infra issues
  }
  return (count ?? 0) >= LIMIT;
}

export async function logAnonAttempt(db: SupabaseClient, ip: string, url: string): Promise<void> {
  await db.from("anon_audit_log").insert({ ip, url });
}
