// Minimal Stripe REST client + webhook-signature verifier.
//
// We deliberately do NOT pull the `stripe` npm package — its bundle is large
// and the surface we need is tiny. Everything below uses `fetch`, Web Crypto
// and the publicly-documented form encoding Stripe expects.
//
// Security:
//   * STRIPE_SECRET_KEY is read from env on every call. Never logged.
//   * Webhook payloads are verified against STRIPE_WEBHOOK_SECRET using HMAC
//     SHA-256 + a 5-minute tolerance window before we trust them.
//   * No customer PII is logged; we surface request-id + status only.

const BASE = "https://api.stripe.com/v1";
const SIG_TOLERANCE_S = 60 * 5;

export class StripeError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new StripeError(`${name} not set`, 500, "MISSING_CREDENTIALS");
  }
  return v;
}

// -------- low-level call --------

function basicAuthHeader(): string {
  const secret = requireEnv("STRIPE_SECRET_KEY");
  return `Basic ${btoa(`${secret}:`)}`;
}

function encodeForm(payload: Record<string, unknown>, prefix = ""): URLSearchParams {
  const params = new URLSearchParams();
  function recurse(p: string, v: unknown) {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) {
      v.forEach((item, i) => recurse(`${p}[${i}]`, item));
      return;
    }
    if (typeof v === "object") {
      for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
        recurse(p ? `${p}[${k}]` : k, child);
      }
      return;
    }
    params.append(p, String(v));
  }
  for (const [k, v] of Object.entries(payload)) recurse(prefix ? `${prefix}[${k}]` : k, v);
  return params;
}

async function stripeRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body: Record<string, unknown> | null,
  opts: { fetchImpl?: typeof fetch; idempotencyKey?: string } = {},
): Promise<T> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const headers: Record<string, string> = { authorization: basicAuthHeader() };
  if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;
  let url = `${BASE}${path}`;
  let init: RequestInit = { method, headers };
  if (body && method !== "GET") {
    headers["content-type"] = "application/x-www-form-urlencoded";
    init = { ...init, body: encodeForm(body).toString() };
  } else if (body && method === "GET") {
    url += `?${encodeForm(body).toString()}`;
  }
  const r = await fetchImpl(url, init);
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    let parsed: { error?: { code?: string; message?: string } } = {};
    try { parsed = JSON.parse(text); } catch { /* empty */ }
    throw new StripeError(
      parsed.error?.message ?? `stripe ${path} failed (${r.status})`,
      r.status,
      parsed.error?.code ?? "HTTP_ERROR",
    );
  }
  return (await r.json()) as T;
}

// -------- customers --------

export interface StripeCustomer {
  id: string;
  email: string | null;
  metadata?: Record<string, string>;
}

export async function createCustomer(
  args: { email: string; userId: string },
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<StripeCustomer> {
  return stripeRequest<StripeCustomer>(
    "POST",
    "/customers",
    {
      email: args.email,
      "metadata[user_id]": args.userId,
    },
    { ...opts, idempotencyKey: `customer-${args.userId}` },
  );
}

export async function retrieveCustomer(
  customerId: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<StripeCustomer> {
  return stripeRequest<StripeCustomer>("GET", `/customers/${customerId}`, null, opts);
}

// -------- checkout sessions --------

export interface CheckoutSession {
  id: string;
  url: string;
  customer: string | null;
  subscription: string | null;
}

export async function createCheckoutSession(
  args: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    userId: string;
    trialDays?: number;
  },
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<CheckoutSession> {
  const payload: Record<string, unknown> = {
    mode: "subscription",
    customer: args.customerId,
    "line_items[0][price]": args.priceId,
    "line_items[0][quantity]": 1,
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    allow_promotion_codes: true,
    "metadata[user_id]": args.userId,
    "subscription_data[metadata][user_id]": args.userId,
  };
  if (args.trialDays && args.trialDays > 0) {
    payload["subscription_data[trial_period_days]"] = args.trialDays;
  }
  return stripeRequest<CheckoutSession>("POST", "/checkout/sessions", payload, opts);
}

// -------- customer portal --------

export interface PortalSession { id: string; url: string }

export async function createPortalSession(
  args: { customerId: string; returnUrl: string },
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<PortalSession> {
  return stripeRequest<PortalSession>(
    "POST",
    "/billing_portal/sessions",
    { customer: args.customerId, return_url: args.returnUrl },
    opts,
  );
}

// -------- subscriptions (read on webhook) --------

export interface StripeSubscription {
  id: string;
  customer: string;
  status:
    | "trialing" | "active" | "past_due" | "canceled" | "unpaid"
    | "incomplete" | "incomplete_expired" | "paused";
  current_period_end: number;          // unix seconds
  cancel_at_period_end: boolean;
  trial_end: number | null;            // unix seconds, nullable
  items: { data: { price: { id: string } }[] };
  metadata?: Record<string, string>;
}

export async function retrieveSubscription(
  subscriptionId: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<StripeSubscription> {
  return stripeRequest<StripeSubscription>("GET", `/subscriptions/${subscriptionId}`, null, opts);
}

// -------- webhook signature verification --------

/**
 * Verifies the `Stripe-Signature` header against the raw request body, using
 * the timing-safe HMAC-SHA-256 scheme documented at
 * https://stripe.com/docs/webhooks/signatures.
 *
 * Returns the parsed event JSON on success; throws otherwise.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  opts: { now?: number; tolerance?: number } = {},
): Promise<{ id: string; type: string; data: { object: unknown }; livemode: boolean }> {
  if (!signatureHeader) throw new StripeError("missing stripe signature header", 400, "BAD_SIGNATURE");
  const secret = requireEnv("STRIPE_WEBHOOK_SECRET");
  const tolerance = opts.tolerance ?? SIG_TOLERANCE_S;
  const now = opts.now ?? Math.floor(Date.now() / 1000);

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return i < 0 ? [kv, ""] : [kv.slice(0, i), kv.slice(i + 1)];
    }),
  );
  const timestamp = Number(parts.t);
  const v1 = parts.v1;
  if (!timestamp || !v1) throw new StripeError("malformed stripe signature", 400, "BAD_SIGNATURE");
  if (Math.abs(now - timestamp) > tolerance) {
    throw new StripeError("stripe signature timestamp outside tolerance", 400, "STALE_SIGNATURE");
  }

  const signed = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret).buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signed).buffer as ArrayBuffer,
  );
  const expected = bytesToHex(new Uint8Array(sigBuf));
  if (!timingSafeEqual(expected, v1)) {
    throw new StripeError("stripe signature mismatch", 400, "BAD_SIGNATURE");
  }
  return JSON.parse(rawBody) as { id: string; type: string; data: { object: unknown }; livemode: boolean };
}

function bytesToHex(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += x.toString(16).padStart(2, "0");
  return s;
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// -------- price → plan mapping --------

import { type Plan } from "./plans.js";

/**
 * Maps a Stripe price ID to one of our internal plan tiers. Env vars are read
 * lazily so a missing var doesn't crash unrelated code paths.
 */
export function priceIdToPlan(priceId: string): Plan | null {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return null;
}

export function planToPriceId(plan: Plan): string | null {
  if (plan === "starter") return process.env.STRIPE_PRICE_STARTER ?? null;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO ?? null;
  return null;
}
