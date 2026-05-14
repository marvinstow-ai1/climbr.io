import type { SupabaseClient } from "@supabase/supabase-js";
import { json } from "./validation.js";
import { normalizePlan, type Plan } from "./plans.js";

export interface AuthContext {
  userId: string;
  plan: Plan;
}

// Resolve the caller from Authorization: Bearer <jwt>. Returns either a usable
// AuthContext or an error Response — callers just `if (ctx instanceof Response) return ctx`.
export async function requireAuth(req: Request, db: SupabaseClient): Promise<AuthContext | Response> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return json({ error: { code: "AUTH_REQUIRED", message: "auth required" } }, { status: 401 });
  }
  const token = auth.slice("Bearer ".length);
  const { data: userRes } = await db.auth.getUser(token);
  const authUser = userRes?.user;
  if (!authUser?.id) {
    return json({ error: { code: "INVALID_TOKEN", message: "invalid token" } }, { status: 401 });
  }
  const userId = authUser.id;
  // The handle_new_user trigger normally seeds public.users on auth.users
  // insert, but accounts that predate the migration (or were created via
  // an admin path that bypassed the trigger) are missing the row. Without
  // it, every FK to public.users(id) — projects, settings, ... — 23503s
  // on insert. Always upsert here so the row is guaranteed to exist by
  // the time the caller's handler runs its own inserts. Idempotent.
  const email = authUser.email ?? `${userId}@unknown.local`;
  const { error: upsertErr } = await db
    .from("users")
    .upsert({ id: userId, email }, { onConflict: "id", ignoreDuplicates: false });
  if (upsertErr) {
    // Fall back to ignoring an email-uniqueness collision from an orphaned
    // row: re-try upserting on the email key so the existing row gets
    // re-linked to this id. If that still fails, surface the original.
    const { error: retryErr } = await db
      .from("users")
      .upsert({ id: userId, email }, { onConflict: "email", ignoreDuplicates: false });
    if (retryErr) {
      console.error("[auth] users upsert failed", { userId, email, upsertErr, retryErr });
      return json({ error: { message: `could not initialize user profile: ${upsertErr.message}` } }, { status: 500 });
    }
  }
  const { data: profile } = await db.from("users").select("plan").eq("id", userId).maybeSingle();
  return { userId, plan: normalizePlan(profile?.plan) };
}
