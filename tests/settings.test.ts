/**
 * API tests for the Phase-4 Bereich-3 endpoints:
 *   - GET   /api/settings              → profile + plan + usage + notifications
 *   - PATCH /api/settings/notifications → toggle email_notifications
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeFakeSupabase, type FakeState } from "./fakes/supabase.js";

vi.mock("../lib/supabase.js", async () => {
  const actual = await vi.importActual<typeof import("../lib/supabase.js")>("../lib/supabase.js");
  return { ...actual, serverClient: vi.fn() };
});

import { serverClient } from "../lib/supabase.js";

async function importGet() {
  return (await import("../api/settings.js")).default;
}

async function importPatch() {
  return (await import("../api/settings/notifications.js")).default;
}

function reqJson(opts: { token?: string; method?: string; body?: unknown; path?: string } = {}): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  return new Request(`https://test.local${opts.path ?? "/api/settings"}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetModules();
});

function setup(partial: Partial<FakeState> & { plan?: string; userId?: string; email?: string } = {}) {
  const userId = partial.userId ?? "00000000-0000-0000-0000-000000000001";
  const email = partial.email ?? "tester@example.com";
  const fake = makeFakeSupabase({
    user: { id: userId, email },
    state: {
      users: partial.users ?? [{ id: userId, email, plan: partial.plan ?? "free" }],
      projects: partial.projects ?? [],
      keywords: partial.keywords ?? [],
      audits: partial.audits ?? [],
      settings: partial.settings ?? [],
    },
  });
  vi.mocked(serverClient).mockReturnValue(fake.client as unknown as ReturnType<typeof serverClient>);
  return { fake, userId };
}

describe("GET /api/settings", () => {
  it("returns 401 without auth", async () => {
    setup();
    const handler = await importGet();
    const res = await handler(reqJson());
    expect(res.status).toBe(401);
  });

  it("returns 405 for non-GET", async () => {
    setup();
    const handler = await importGet();
    const res = await handler(reqJson({ token: "t", method: "POST" }));
    expect(res.status).toBe(405);
  });

  it("returns profile, plan, limits, and notifications defaults", async () => {
    setup({ plan: "free", email: "alice@example.com" });
    const handler = await importGet();
    const res = await handler(reqJson({ token: "t" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      profile: { email: string };
      plan: { name: string; limits: { keywords: number; auditsPerMonth: number } };
      usage: { projects: number; auditsThisMonth: number };
      notifications: { email_notifications: boolean };
    };
    expect(body.profile.email).toBe("alice@example.com");
    expect(body.plan.name).toBe("free");
    expect(body.plan.limits.keywords).toBe(5);
    expect(body.plan.limits.auditsPerMonth).toBe(3);
    expect(body.usage.projects).toBe(0);
    expect(body.notifications.email_notifications).toBe(true);
  });

  it("reflects the stored email_notifications value", async () => {
    setup({
      userId: "user-1",
      settings: [{ user_id: "user-1", email_notifications: false }],
    });
    const handler = await importGet();
    const res = await handler(reqJson({ token: "t" }));
    const body = (await res.json()) as { notifications: { email_notifications: boolean } };
    expect(body.notifications.email_notifications).toBe(false);
  });

  it("counts the user's projects", async () => {
    setup({
      userId: "user-1",
      projects: [
        { id: "p1", user_id: "user-1", domain: "a.com" },
        { id: "p2", user_id: "user-1", domain: "b.com" },
        { id: "p3", user_id: "other-user", domain: "not-mine.com" },
      ],
    });
    const handler = await importGet();
    const res = await handler(reqJson({ token: "t" }));
    const body = (await res.json()) as { usage: { projects: number } };
    expect(body.usage.projects).toBe(2);
  });
});

describe("PATCH /api/settings/notifications", () => {
  it("returns 401 without auth", async () => {
    setup();
    const handler = await importPatch();
    const res = await handler(reqJson({ method: "PATCH", body: { email_notifications: false } }));
    expect(res.status).toBe(401);
  });

  it("returns 405 for non-PATCH", async () => {
    setup();
    const handler = await importPatch();
    const res = await handler(reqJson({ token: "t", method: "GET" }));
    expect(res.status).toBe(405);
  });

  it("returns 400 for invalid body", async () => {
    setup();
    const handler = await importPatch();
    const res = await handler(reqJson({ token: "t", method: "PATCH", body: { email_notifications: "not-a-bool" } }));
    expect(res.status).toBe(400);
  });

  it("updates and persists the value", async () => {
    const { fake, userId } = setup({
      userId: "user-1",
      settings: [{ user_id: "user-1", email_notifications: true }],
    });
    const handler = await importPatch();
    const res = await handler(reqJson({ token: "t", method: "PATCH", body: { email_notifications: false } }));
    expect(res.status).toBe(200);
    const settingsRow = fake.state.settings.find((s) => s.user_id === userId);
    expect(settingsRow?.email_notifications).toBe(false);
  });

  it("creates a settings row if none existed yet (upsert behaviour)", async () => {
    const { fake } = setup({ userId: "user-1", settings: [] });
    const handler = await importPatch();
    const res = await handler(reqJson({ token: "t", method: "PATCH", body: { email_notifications: true } }));
    expect(res.status).toBe(200);
    expect(fake.state.settings).toHaveLength(1);
    expect(fake.state.settings[0]).toMatchObject({ user_id: "user-1", email_notifications: true });
  });
});
