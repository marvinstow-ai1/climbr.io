import { describe, expect, it } from "vitest";
import {
  fetchSerpResults,
  fetchKeywordMetrics,
  fetchDomainPositionForKeyword,
  locationCodeFor,
  languageCodeFor,
} from "../lib/dataforseo.js";

describe("dataforseo locale helpers", () => {
  it("maps DE/EN to DataForSEO location + language codes", () => {
    expect(locationCodeFor("de")).toBe(2276);
    expect(locationCodeFor("en")).toBe(2840);
    expect(languageCodeFor("de")).toBe("de");
    expect(languageCodeFor("en")).toBe("en");
  });
});

describe("dataforseo mock mode", () => {
  it("returns 10 deterministic SERP entries", async () => {
    const a = await fetchSerpResults("leather backpack", "de", { mock: true });
    const b = await fetchSerpResults("leather backpack", "de", { mock: true });
    expect(a).toHaveLength(10);
    expect(a[0]!.position).toBe(1);
    expect(a[9]!.position).toBe(10);
    expect(a).toEqual(b); // deterministic
  });

  it("returns metric records for each keyword passed in", async () => {
    const out = await fetchKeywordMetrics(["a", "b", "c"], "de", { mock: true });
    expect(out).toHaveLength(3);
    for (const row of out) {
      expect(row.search_volume).toBeGreaterThanOrEqual(50);
      expect(row.search_volume).toBeLessThanOrEqual(50000);
    }
  });

  it("fetchDomainPositionForKeyword returns null when domain is not in mock SERP", async () => {
    const pos = await fetchDomainPositionForKeyword("query", "not-a-real-domain.example", "de", { mock: true });
    expect(pos).toBeNull();
  });

  it("fetchDomainPositionForKeyword finds the mocked example domain", async () => {
    const pos = await fetchDomainPositionForKeyword("query", "example3.com", "de", { mock: true });
    expect(pos).toBe(3);
  });
});

describe("dataforseo cache + http", () => {
  function fakeDb(initial: Record<string, unknown> = {}): {
    db: {
      from: (t: string) => unknown;
    };
    state: Record<string, unknown>;
  } {
    const state: Record<string, unknown> = { ...initial };
    let last: { table: string; op: string; key?: string } = { table: "", op: "" };

    function table(t: string) {
      const chain = {
        select(_c: string) {
          last = { table: t, op: "select" };
          return chain;
        },
        eq(_k: string, v: string) {
          last.key = v;
          return chain;
        },
        gt(_k: string, _v: string) {
          return chain;
        },
        maybeSingle: async () => {
          if (last.op === "select" && last.key && state[last.key]) {
            return { data: state[last.key], error: null };
          }
          return { data: null, error: null };
        },
        upsert(row: { cache_key: string; response: unknown }) {
          state[row.cache_key] = { response: row.response, expires_at: new Date(Date.now() + 60_000).toISOString() };
          return { error: null };
        },
      };
      return chain;
    }
    return { db: { from: table }, state };
  }

  it("hits the network exactly once when cached", async () => {
    const { db } = fakeDb();
    let calls = 0;
    const fetchImpl = (async (_url: string, _opts?: unknown) => {
      calls++;
      return new Response(
        JSON.stringify({
          status_code: 20000,
          tasks: [
            {
              status_code: 20000,
              result: [
                {
                  items: [
                    { type: "organic", rank_absolute: 1, title: "t", url: "https://x.test/", domain: "x.test", description: "d" },
                  ],
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    process.env.DATAFORSEO_LOGIN = "u";
    process.env.DATAFORSEO_PASSWORD = "p";

    const opts = { db: db as never, fetchImpl, cacheTtlSeconds: 60 };
    const first = await fetchSerpResults("k", "de", opts);
    const second = await fetchSerpResults("k", "de", opts);
    expect(calls).toBe(1);
    expect(first).toEqual(second);
    expect(first[0]!.domain).toBe("x.test");
  });

  it("surfaces a typed error when credentials are missing", async () => {
    delete process.env.DATAFORSEO_LOGIN;
    delete process.env.DATAFORSEO_PASSWORD;
    await expect(
      fetchSerpResults("k", "de", {
        // bypass mock: explicit false
        mock: false,
        // no fetchImpl: should never get there because auth header throws first
        fetchImpl: (async () => new Response("{}")) as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "MISSING_CREDENTIALS" });
  });
});
