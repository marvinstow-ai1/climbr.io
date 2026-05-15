import { afterEach, describe, expect, it } from "vitest";
import { createCheckoutSession, priceIdToPlan, planToPriceId, verifyWebhookSignature, StripeError } from "../lib/stripe.js";

const SECRET = "whsec_test_secret_value";

async function sign(rawBody: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET).buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`).buffer as ArrayBuffer,
  );
  let hex = "";
  for (const b of new Uint8Array(sig)) hex += b.toString(16).padStart(2, "0");
  return `t=${timestamp},v1=${hex}`;
}

afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_STARTER;
  delete process.env.STRIPE_PRICE_PRO;
});

describe("priceIdToPlan / planToPriceId", () => {
  it("resolves env-configured prices", () => {
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    process.env.STRIPE_PRICE_PRO = "price_pro";
    expect(priceIdToPlan("price_starter")).toBe("starter");
    expect(priceIdToPlan("price_pro")).toBe("pro");
    expect(priceIdToPlan("price_unknown")).toBeNull();
    expect(planToPriceId("starter")).toBe("price_starter");
    expect(planToPriceId("pro")).toBe("price_pro");
    expect(planToPriceId("free")).toBeNull();
  });

  it("returns null when env not configured", () => {
    expect(planToPriceId("starter")).toBeNull();
  });
});

describe("verifyWebhookSignature", () => {
  it("returns the parsed event on a valid signature", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    const now = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: {} }, livemode: false });
    const header = await sign(body, now);
    const event = await verifyWebhookSignature(body, header, { now });
    expect(event.id).toBe("evt_1");
    expect(event.type).toBe("checkout.session.completed");
  });

  it("rejects a tampered body (mismatched HMAC)", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    const now = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ id: "evt_1", type: "x", data: { object: {} }, livemode: false });
    const header = await sign(body, now);
    // Tamper *after* signing — signature should no longer match.
    const tampered = body.replace('"evt_1"', '"evt_evil"');
    await expect(verifyWebhookSignature(tampered, header, { now })).rejects.toBeInstanceOf(StripeError);
  });

  it("rejects a stale timestamp outside the tolerance window", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    const past = Math.floor(Date.now() / 1000) - 60 * 30;  // 30 minutes ago
    const body = JSON.stringify({ id: "evt_2", type: "x", data: { object: {} }, livemode: false });
    const header = await sign(body, past);
    await expect(verifyWebhookSignature(body, header)).rejects.toMatchObject({ code: "STALE_SIGNATURE" });
  });

  it("rejects a missing signature header", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    await expect(verifyWebhookSignature("{}", null)).rejects.toMatchObject({ code: "BAD_SIGNATURE" });
  });

  it("rejects a malformed signature header (no v1 entry)", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    const now = Math.floor(Date.now() / 1000);
    await expect(verifyWebhookSignature("{}", `t=${now}`, { now })).rejects.toMatchObject({ code: "BAD_SIGNATURE" });
  });
});

describe("createCheckoutSession (form encoding)", () => {
  it("posts subscription-mode form-encoded body with metadata", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    let capturedBody = "";
    let capturedAuth = "";
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      capturedBody = String(init?.body ?? "");
      const auth = (init?.headers as Record<string, string>)?.authorization ?? "";
      capturedAuth = auth;
      return new Response(JSON.stringify({ id: "cs_1", url: "https://stripe/co", customer: "cus_1", subscription: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const session = await createCheckoutSession(
      {
        customerId: "cus_1",
        priceId: "price_x",
        successUrl: "https://app/?s=1",
        cancelUrl: "https://app/?c=1",
        userId: "user-uuid",
        trialDays: 14,
      },
      { fetchImpl },
    );
    expect(session.url).toBe("https://stripe/co");
    expect(capturedBody).toContain("mode=subscription");
    expect(capturedBody).toContain("customer=cus_1");
    expect(capturedBody).toContain("line_items%5B0%5D%5Bprice%5D=price_x");
    expect(capturedBody).toContain("subscription_data%5Btrial_period_days%5D=14");
    expect(capturedBody).toContain("metadata%5Buser_id%5D=user-uuid");
    expect(capturedAuth).toMatch(/^Basic /);
  });
});
