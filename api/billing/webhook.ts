// POST /api/billing/webhook — Stripe webhook receiver.
//
// Verifies the signature against STRIPE_WEBHOOK_SECRET, persists the event
// verbatim to public.billing_events (deduplicated by event_id), and updates
// public.users with the latest subscription state. Idempotent: replays are
// no-ops thanks to the unique(event_id) constraint.

import { serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";
import {
  retrieveSubscription,
  priceIdToPlan,
  verifyWebhookSignature,
  StripeError,
  type StripeSubscription,
} from "../../lib/stripe.js";
import type { Plan } from "../../lib/plans.js";

export const config = { runtime: "nodejs" };

interface CheckoutSessionCompleted {
  id: string;
  customer: string | null;
  subscription: string | null;
  metadata?: Record<string, string>;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: { message: "method not allowed" } }, { status: 405 });

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: { id: string; type: string; data: { object: unknown }; livemode: boolean };
  try {
    event = await verifyWebhookSignature(raw, sig);
  } catch (err) {
    const code = err instanceof StripeError ? err.code : "BAD_SIGNATURE";
    console.warn("[stripe webhook] verification failed", code);
    return json({ error: { code, message: "invalid signature" } }, { status: 400 });
  }

  const db = serverClient();

  // Resolve the user_id: prefer metadata, fall back to a customer-id lookup.
  const obj = event.data.object as { metadata?: Record<string, string>; customer?: string };
  let userId: string | null = obj.metadata?.user_id ?? null;
  if (!userId && obj.customer) {
    const { data } = await db.from("users").select("id").eq("stripe_customer_id", obj.customer).maybeSingle();
    userId = data?.id ?? null;
  }

  // Idempotent insert. If we've already processed this event_id we still want
  // to ack with 200 so Stripe stops retrying.
  const { error: logErr } = await db.from("billing_events").insert({
    event_id: event.id,
    user_id: userId,
    type: event.type,
    payload: event as unknown as object,
  });
  if (logErr && logErr.code !== "23505") {
    console.error("[stripe webhook] log insert failed", logErr.message);
  }
  if (logErr?.code === "23505") {
    // Duplicate event — already processed. Ack and bail.
    return json({ ok: true, deduplicated: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as CheckoutSessionCompleted;
        if (session.subscription && userId) {
          const sub = await retrieveSubscription(session.subscription);
          await applySubscription(db, userId, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.trial_will_end":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const sub = event.data.object as StripeSubscription;
        const resolvedUserId = userId ?? await userIdFromCustomer(db, sub.customer);
        if (resolvedUserId) await applySubscription(db, resolvedUserId, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as StripeSubscription;
        const resolvedUserId = userId ?? await userIdFromCustomer(db, sub.customer);
        if (resolvedUserId) {
          await db.from("users").update({
            plan: "free",
            stripe_subscription_id: null,
            subscription_status: "canceled",
            cancel_at_period_end: false,
            current_period_end: null,
            trial_end: null,
          }).eq("id", resolvedUserId);
        }
        break;
      }
      // Other events (invoice.*, payment_intent.*) are logged but not acted on.
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", event.type, (err as Error).message);
    // Returning 500 makes Stripe retry — fine, since we're idempotent.
    return json({ error: { message: (err as Error).message } }, { status: 500 });
  }

  return json({ ok: true });
}

async function userIdFromCustomer(
  db: ReturnType<typeof serverClient>,
  customerId: string,
): Promise<string | null> {
  const { data } = await db.from("users").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.id ?? null;
}

async function applySubscription(
  db: ReturnType<typeof serverClient>,
  userId: string,
  sub: StripeSubscription,
): Promise<void> {
  const priceId = sub.items.data[0]?.price.id;
  const plan: Plan = priceId ? (priceIdToPlan(priceId) ?? "free") : "free";
  await db.from("users").update({
    plan,
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer,
    subscription_status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
  }).eq("id", userId);
}
