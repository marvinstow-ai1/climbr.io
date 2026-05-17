import type { SupabaseClient } from "@supabase/supabase-js";
import { json } from "./validation.js";
import { normalizePlan, type Plan } from "./plans.js";

export interface AuthContext {
  userId: string;
  plan: Plan;
}

// Resolve the caller from Authorization: Bearer <jwt>. Returns either a usable
// AuthContext or an error Response — callers just `if (ctx instanceof Response) return ctx`.
//
// Hard-Timeout auf jeden Supabase-Roundtrip: wenn SUPABASE_URL falsch
// oder die DB unerreichbar ist, hängt der getUser()-fetch sonst bis
// Vercel die Function killt (504). Mit Timeout bekommt der Aufrufer
// eine klare Fehlermeldung über safeHandler.
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms — Supabase unreachable, prüfe SUPABASE_URL`)), ms)),
  ]);
}

export async function requireAuth(req: Request, db: SupabaseClient): Promise<AuthContext | Response> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return json({ error: { code: "AUTH_REQUIRED", message: "auth required" } }, { status: 401 });
  }
  const token = auth.slice("Bearer ".length);
  const { data: userRes } = await withTimeout(db.auth.getUser(token), 8000, "auth.getUser");
  const userId = userRes?.user?.id;
  if (!userId) {
    return json({ error: { code: "INVALID_TOKEN", message: "invalid token" } }, { status: 401 });
  }
  // Look up the plan from the profile row (created by handle_new_user trigger).
  const { data: profile } = await withTimeout(
    db.from("users").select("plan").eq("id", userId).maybeSingle(),
    5000,
    "users.select(plan)",
  );
  return { userId, plan: normalizePlan(profile?.plan) };
}
