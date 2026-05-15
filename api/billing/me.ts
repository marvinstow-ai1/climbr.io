// GET /api/billing/me — return the caller's plan + subscription status so the
// frontend can render the right CTAs (Upgrade vs. Manage).

import { serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";
import { requireAuth } from "../../lib/auth.js";
import { limitsFor } from "../../lib/plans.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return json({ error: { message: "method not allowed" } }, { status: 405 });
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  const { data, error } = await db
    .from("users")
    .select("plan, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, cancel_at_period_end, trial_end")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error) return json({ error: { message: error.message } }, { status: 500 });

  return json({
    plan: data?.plan ?? "free",
    limits: limitsFor(data?.plan),
    subscription: {
      status: data?.subscription_status ?? null,
      current_period_end: data?.current_period_end ?? null,
      cancel_at_period_end: data?.cancel_at_period_end ?? false,
      trial_end: data?.trial_end ?? null,
      has_customer: Boolean(data?.stripe_customer_id),
    },
  });
}
