// POST /api/billing/checkout — body: { plan: "starter" | "pro", trial?: boolean }.
//
// Idempotently ensures the user has a Stripe customer, then creates a
// Subscription Checkout Session and returns its `url`. The client just
// redirects to that URL.

import { z } from "zod";
import { serverClient } from "../../lib/supabase.js";
import { badRequest, json } from "../../lib/validation.js";
import { requireAuth } from "../../lib/auth.js";
import {
  createCustomer,
  createCheckoutSession,
  planToPriceId,
  StripeError,
} from "../../lib/stripe.js";

export const config = { runtime: "nodejs" };

const Input = z.object({
  plan: z.enum(["starter", "pro"]),
  trial: z.boolean().optional(),
});

const TRIAL_DAYS = 14;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: { message: "method not allowed" } }, { status: 405 });
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("invalid JSON body"); }
  const parsed = Input.safeParse(body);
  if (!parsed.success) return badRequest("invalid input", parsed.error.flatten());

  const priceId = planToPriceId(parsed.data.plan);
  if (!priceId) {
    return json(
      { error: { code: "PRICE_NOT_CONFIGURED", message: "Price ID for that plan is not configured." } },
      { status: 500 },
    );
  }

  const { data: profile, error } = await db
    .from("users")
    .select("email, stripe_customer_id")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error || !profile?.email) {
    return json({ error: { message: error?.message ?? "user not found" } }, { status: 500 });
  }

  try {
    let customerId = profile.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await createCustomer({ email: profile.email, userId: ctx.userId });
      customerId = customer.id;
      await db.from("users").update({ stripe_customer_id: customerId }).eq("id", ctx.userId);
    }

    const origin = req.headers.get("origin") ?? process.env.APP_URL ?? "https://climbr.io";
    const session = await createCheckoutSession({
      customerId,
      priceId,
      userId: ctx.userId,
      successUrl: `${origin}/billing?status=success`,
      cancelUrl: `${origin}/pricing?status=cancel`,
      trialDays: parsed.data.trial ? TRIAL_DAYS : undefined,
    });
    return json({ url: session.url });
  } catch (err) {
    if (err instanceof StripeError) {
      return json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return json({ error: { message: (err as Error).message } }, { status: 500 });
  }
}
