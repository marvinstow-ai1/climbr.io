// POST /api/billing/portal — returns a Stripe Billing Portal URL for the
// caller's customer record. The client redirects there.

import { serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";
import { requireAuth } from "../../lib/auth.js";
import { createPortalSession, StripeError } from "../../lib/stripe.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: { message: "method not allowed" } }, { status: 405 });
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  const { data } = await db
    .from("users")
    .select("stripe_customer_id")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (!data?.stripe_customer_id) {
    return json(
      { error: { code: "NO_CUSTOMER", message: "No billing record yet. Subscribe first." } },
      { status: 404 },
    );
  }

  const origin = req.headers.get("origin") ?? process.env.APP_URL ?? "https://climbr.io";
  try {
    const session = await createPortalSession({
      customerId: data.stripe_customer_id,
      returnUrl: `${origin}/billing`,
    });
    return json({ url: session.url });
  } catch (err) {
    if (err instanceof StripeError) {
      return json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return json({ error: { message: (err as Error).message } }, { status: 500 });
  }
}
