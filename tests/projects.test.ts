import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeFakeSupabase, type FakeState } from "./fakes/supabase.js";

vi.mock("../lib/supabase.js", async () => {
  const actual = await vi.importActual<typeof import("../lib/supabase.js")>("../lib/supabase.js");
  return {
    ...actual,
    serverClient: vi.fn(),
  };
});

import { serverClient } from "../lib/supabase.js";

async function importHandler() {
  const mod = await import("../api/projects.js");
  return mod.default;
}

async function importTrackHandler() {
  const mod = await import("../api/rankings/track.js");
  return mod.default;
}

function reqJson(body: unknown, opts: { token?: string; method?: string } = {}): Request {
  return new Request("https://test.local/api/projects", {
    method: opts.method ?? "POST",
    headers: {
      "content-type": "application/json",
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetModules();
});

describe("POST /api/projects", () => {
  function setup(partial: Partial<FakeState> & { plan?: string; userId?: string } = {}) {
    const userId = partial.userId ?? "00000000-0000-0000-0000-000000000001";
    const fake = makeFakeSupabase({
      user: { id: userId },
      state: {
        users: [{ id: userId, plan: partial.plan ?? "free" }],
        projects: partial.projects ?? [],
        keywords: partial.keywords ?? [],
        audits: partial.audits ?? [],
      },
    });
    vi.mocked(serverClient).mockReturnValue(fake.client as unknown as ReturnType<typeof serverClient>);
    return { fake, userId };
  }

  it("rejects unauthenticated requests", async () => {
    setup();
    const handler = await importHandler();
    const res = await handler(reqJson({ domain: "example.com" }));
    expect(res.status).toBe(401);
  });

  it("rejects invalid domains", async () => {
    setup();
    const handler = await importHandler();
    const res = await handler(reqJson({ domain: "not a domain!" }, { token: "t" }));
    expect(res.status).toBe(400);
  });

  it("creates a project with no keywords", async () => {
    const { fake } = setup();
    const handler = await importHandler();
    const res = await handler(reqJson({ domain: "https://www.Example.com/foo" }, { token: "t" }));
    expect(res.status).toBe(201);
    const body = await res.json() as { project: { domain: string }; keywords: unknown[] };
    expect(body.project.domain).toBe("example.com");
    expect(body.keywords).toEqual([]);
    expect(fake.state.projects).toHaveLength(1);
  });

  it("creates a project with initial keywords (de-duplicated case-insensitively)", async () => {
    const { fake } = setup();
    const handler = await importHandler();
    const res = await handler(reqJson(
      { domain: "example.com", keywords: ["Leather Backpack", "leather backpack", "handmade wallet"] },
      { token: "t" },
    ));
    expect(res.status).toBe(201);
    expect(fake.state.keywords).toHaveLength(2);
  });

  it("returns 409 on duplicate (user, domain)", async () => {
    setup({
      projects: [{ id: "p-1", user_id: "00000000-0000-0000-0000-000000000001", domain: "example.com" }],
    });
    const handler = await importHandler();
    const res = await handler(reqJson({ domain: "example.com" }, { token: "t" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("DUPLICATE_PROJECT");
  });

  it("rolls back the project if keyword insertion fails (free plan over limit)", async () => {
    // Free plan tracks 5 → 6 should be rejected by the plan check.
    const { fake } = setup({ plan: "free" });
    const handler = await importHandler();
    const res = await handler(reqJson(
      { domain: "example.com", keywords: ["a", "b", "c", "d", "e", "f"] },
      { token: "t" },
    ));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error.code).toBe("PLAN_LIMIT_REACHED");
    expect(body.error.limit).toBe(5);
    expect(fake.state.projects).toHaveLength(0); // no project created
  });

  it("starter plan accepts up to 25 keywords on create", async () => {
    setup({ plan: "starter" });
    const handler = await importHandler();
    const res = await handler(reqJson(
      { domain: "example.com", keywords: Array.from({ length: 20 }, (_, i) => `k-${i}`) },
      { token: "t" },
    ));
    expect(res.status).toBe(201);
  });
});

describe("POST /api/rankings/track (plan-aware keyword limit)", () => {
  function setup(partial: { plan?: string; userId?: string; existingKeywords?: number } = {}) {
    const userId = partial.userId ?? "00000000-0000-0000-0000-000000000001";
    const projectId = "00000000-0000-0000-0000-0000000000aa";
    const existing = Array.from({ length: partial.existingKeywords ?? 0 }, (_, i) => ({
      id: `k-${i}`,
      project_id: projectId,
      keyword: `existing-${i}`,
    }));
    const fake = makeFakeSupabase({
      user: { id: userId },
      state: {
        users: [{ id: userId, plan: partial.plan ?? "free" }],
        projects: [{ id: projectId, user_id: userId, domain: "example.com" }],
        keywords: existing,
        audits: [],
      },
    });
    vi.mocked(serverClient).mockReturnValue(fake.client as unknown as ReturnType<typeof serverClient>);
    return { fake, userId, projectId };
  }

  function trackReq(body: unknown, token = "t") {
    return new Request("https://test.local/api/rankings/track", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  }

  it("returns 402 with PLAN_LIMIT_REACHED on free plan at 5 keywords", async () => {
    const { projectId } = setup({ plan: "free", existingKeywords: 5 });
    const handler = await importTrackHandler();
    const res = await handler(trackReq({ projectId, keyword: "new" }));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error.code).toBe("PLAN_LIMIT_REACHED");
    expect(body.error.resource).toBe("keywords");
    expect(body.error.limit).toBe(5);
    expect(body.error.current).toBe(5);
  });

  it("starter plan allows the 6th keyword", async () => {
    const { fake, projectId } = setup({ plan: "starter", existingKeywords: 5 });
    const handler = await importTrackHandler();
    const res = await handler(trackReq({ projectId, keyword: "new" }));
    expect(res.status).toBe(201);
    expect(fake.state.keywords).toHaveLength(6);
  });

  it("returns 409 DUPLICATE_KEYWORD on conflict", async () => {
    const { projectId } = setup({ plan: "free", existingKeywords: 1 });
    const handler = await importTrackHandler();
    const res = await handler(trackReq({ projectId, keyword: "existing-0" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("DUPLICATE_KEYWORD");
  });

  it("forbids tracking on a project the caller does not own", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";
    const otherUser = "00000000-0000-0000-0000-000000000999";
    const fake = makeFakeSupabase({
      user: { id: userId },
      state: {
        users: [{ id: userId, plan: "free" }],
        projects: [{ id: "00000000-0000-0000-0000-0000000000cc", user_id: otherUser, domain: "rival.com" }],
        keywords: [],
        audits: [],
      },
    });
    vi.mocked(serverClient).mockReturnValue(fake.client as unknown as ReturnType<typeof serverClient>);
    const handler = await importTrackHandler();
    const res = await handler(trackReq({ projectId: "00000000-0000-0000-0000-0000000000cc", keyword: "new" }));
    expect(res.status).toBe(403);
  });

  it("DELETE removes own keyword, refuses others'", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";
    const otherUser = "00000000-0000-0000-0000-000000000999";
    const fake = makeFakeSupabase({
      user: { id: userId },
      state: {
        users: [{ id: userId, plan: "free" }],
        projects: [
          { id: "00000000-0000-0000-0000-0000000000d1", user_id: userId, domain: "mine.com" },
          { id: "00000000-0000-0000-0000-0000000000d2", user_id: otherUser, domain: "rival.com" },
        ],
        keywords: [
          { id: "00000000-0000-0000-0000-000000000aaa", project_id: "00000000-0000-0000-0000-0000000000d1", keyword: "mine" },
          { id: "00000000-0000-0000-0000-000000000bbb", project_id: "00000000-0000-0000-0000-0000000000d2", keyword: "theirs" },
        ],
        audits: [],
      },
    });
    vi.mocked(serverClient).mockReturnValue(fake.client as unknown as ReturnType<typeof serverClient>);
    const handler = await importTrackHandler();

    const okReq = new Request("https://t.local/api/rankings/track?id=00000000-0000-0000-0000-000000000aaa", {
      method: "DELETE", headers: { authorization: "Bearer t" },
    });
    const okRes = await handler(okReq);
    expect(okRes.status).toBe(200);
    expect(fake.state.keywords.find((k) => k.id === "00000000-0000-0000-0000-000000000aaa")).toBeUndefined();

    const badReq = new Request("https://t.local/api/rankings/track?id=00000000-0000-0000-0000-000000000bbb", {
      method: "DELETE", headers: { authorization: "Bearer t" },
    });
    const badRes = await handler(badReq);
    expect(badRes.status).toBe(404);
    expect(fake.state.keywords.find((k) => k.id === "00000000-0000-0000-0000-000000000bbb")).toBeDefined();
  });
});
