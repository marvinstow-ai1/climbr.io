import { describe, expect, it, beforeEach } from "vitest";
import {
  buildAuthorizeUrl,
  exchangeCode,
  fetchGscPosition,
  pickPropertyForDomain,
  refreshAccessToken,
  RetryableError,
  signState,
  verifyState,
  withBackoff,
} from "../lib/gsc.js";
import { encryptToken, decryptToken } from "../lib/supabase.js";

const HEX32 = "0".repeat(64);

beforeEach(() => {
  process.env.OAUTH_STATE_SECRET = HEX32;
  process.env.TOKEN_ENCRYPTION_KEY = HEX32;
  process.env.GSC_CLIENT_ID = "test-client-id";
  process.env.GSC_CLIENT_SECRET = "test-client-secret";
  process.env.GSC_REDIRECT_URI = "http://localhost:3000/api/gsc/callback";
});

describe("state signing", () => {
  it("round-trips a valid payload", async () => {
    const payload = { projectId: "p-1", userId: "u-1", exp: Date.now() + 60_000 };
    const state = await signState(payload);
    const verified = await verifyState(state);
    expect(verified).toEqual(payload);
  });

  it("rejects a tampered state", async () => {
    const state = await signState({ projectId: "p-1", userId: "u-1", exp: Date.now() + 60_000 });
    const [body, mac] = state.split(".");
    const tampered = `${body}A.${mac}`;
    expect(await verifyState(tampered)).toBeNull();
  });

  it("rejects an expired state", async () => {
    const state = await signState({ projectId: "p-1", userId: "u-1", exp: Date.now() - 1 });
    expect(await verifyState(state)).toBeNull();
  });

  it("rejects malformed state", async () => {
    expect(await verifyState("garbage")).toBeNull();
    expect(await verifyState("a.b")).toBeNull();
  });
});

describe("buildAuthorizeUrl", () => {
  it("constructs a Google consent URL with offline access", async () => {
    const state = await signState({ projectId: "p-1", userId: "u-1", exp: Date.now() + 60_000 });
    const url = new URL(buildAuthorizeUrl(state));
    expect(url.host).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toContain("webmasters.readonly");
    expect(url.searchParams.get("state")).toBe(state);
  });
});

describe("exchangeCode", () => {
  it("sends the right form body and returns parsed tokens", async () => {
    let captured: Request | null = null;
    const fetchImpl: typeof fetch = async (input, init) => {
      captured = new Request(input as RequestInfo, init);
      return new Response(
        JSON.stringify({
          access_token: "at-1",
          refresh_token: "rt-1",
          expires_in: 3599,
          scope: "https://www.googleapis.com/auth/webmasters.readonly",
          token_type: "Bearer",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const result = await exchangeCode("auth-code", { fetchImpl });
    expect(result.accessToken).toBe("at-1");
    expect(result.refreshToken).toBe("rt-1");
    expect(captured).not.toBeNull();
    const body = await captured!.text();
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code=auth-code");
    expect(body).toContain("client_id=test-client-id");
  });

  it("does not echo the response body in error messages", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({ error: "invalid_grant", refresh_token: "should-not-leak" }),
        { status: 400 },
      );
    let err: Error | null = null;
    try {
      await exchangeCode("bad-code", { fetchImpl });
    } catch (e) {
      err = e as Error;
    }
    expect(err).not.toBeNull();
    expect(err!.message).toContain("400");
    expect(err!.message).toContain("invalid_grant");
    expect(err!.message).not.toContain("should-not-leak");
  });
});

describe("refreshAccessToken", () => {
  it("sends grant_type=refresh_token", async () => {
    let captured: string | null = null;
    const fetchImpl: typeof fetch = async (_url, init) => {
      const body = init?.body;
      captured = body instanceof URLSearchParams ? body.toString() : String(body);
      return new Response(
        JSON.stringify({ access_token: "at-2", expires_in: 3599 }),
        { status: 200 },
      );
    };
    const result = await refreshAccessToken("rt-x", { fetchImpl });
    expect(result.accessToken).toBe("at-2");
    expect(captured).toContain("grant_type=refresh_token");
    expect(captured).toContain("refresh_token=rt-x");
  });
});

describe("pickPropertyForDomain", () => {
  const sites = [
    { siteUrl: "sc-domain:example.com", permissionLevel: "siteOwner" },
    { siteUrl: "https://example.com/", permissionLevel: "siteOwner" },
    { siteUrl: "https://unrelated.com/", permissionLevel: "siteOwner" },
    { siteUrl: "https://pending.com/", permissionLevel: "siteUnverifiedUser" },
  ];

  it("prefers the sc-domain property when verified", () => {
    expect(pickPropertyForDomain(sites, "example.com")?.siteUrl).toBe("sc-domain:example.com");
  });

  it("falls back to URL-prefix property", () => {
    const noDomain = sites.filter((s) => !s.siteUrl.startsWith("sc-domain"));
    expect(pickPropertyForDomain(noDomain, "example.com")?.siteUrl).toBe("https://example.com/");
  });

  it("ignores unverified sites", () => {
    expect(pickPropertyForDomain(sites, "pending.com")).toBeNull();
  });

  it("strips www and trailing slash in match", () => {
    expect(pickPropertyForDomain(sites, "www.example.com/")?.siteUrl).toBe("sc-domain:example.com");
  });

  it("returns null when no match", () => {
    expect(pickPropertyForDomain(sites, "missing.org")).toBeNull();
  });
});

describe("fetchGscPosition", () => {
  it("returns rounded avg position when GSC returns a row", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      calls.push({ url, init });
      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "at-99", expires_in: 3599 }), { status: 200 });
      }
      if (url.includes("/searchAnalytics/query")) {
        // Verify the access token is used and not the refresh token.
        const auth = (init?.headers as Record<string, string> | undefined)?.["authorization"]
          ?? (init?.headers as Record<string, string> | undefined)?.["Authorization"];
        expect(auth).toBe("Bearer at-99");
        return new Response(JSON.stringify({ rows: [{ position: 12.6 }] }), { status: 200 });
      }
      return new Response("nope", { status: 404 });
    };

    const pos = await fetchGscPosition({
      refreshToken: "secret-rt",
      siteUrl: "sc-domain:example.com",
      keyword: "leather backpack",
      fetchImpl,
      now: new Date("2026-05-13T00:00:00Z"),
      retries: 0,
    });
    expect(pos).toBe(13);

    // Refresh token is sent only to the token endpoint, never to the analytics call.
    const analytics = calls.find((c) => c.url.includes("/searchAnalytics/query"));
    expect(analytics?.init?.body as string).not.toContain("secret-rt");
  });

  it("returns null when GSC returns no rows", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "at", expires_in: 60 }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    };
    const pos = await fetchGscPosition({
      refreshToken: "rt",
      siteUrl: "sc-domain:example.com",
      keyword: "obscure",
      fetchImpl,
      retries: 0,
    });
    expect(pos).toBeNull();
  });

  it("retries on 429 then succeeds", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "at", expires_in: 60 }), { status: 200 });
      }
      calls++;
      if (calls < 2) {
        return new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } }), { status: 429 });
      }
      return new Response(JSON.stringify({ rows: [{ position: 5 }] }), { status: 200 });
    };
    const pos = await fetchGscPosition({
      refreshToken: "rt",
      siteUrl: "sc-domain:example.com",
      keyword: "k",
      fetchImpl,
      retries: 2,
    });
    expect(pos).toBe(5);
    expect(calls).toBe(2);
  });

  it("does not retry on 403", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "at", expires_in: 60 }), { status: 200 });
      }
      calls++;
      return new Response(JSON.stringify({ error: { status: "PERMISSION_DENIED" } }), { status: 403 });
    };
    await expect(
      fetchGscPosition({
        refreshToken: "rt",
        siteUrl: "sc-domain:example.com",
        keyword: "k",
        fetchImpl,
        retries: 3,
      }),
    ).rejects.toThrow(/403/);
    expect(calls).toBe(1);
  });
});

describe("withBackoff", () => {
  it("retries RetryableError up to N times then throws", async () => {
    let n = 0;
    await expect(
      withBackoff(
        async () => {
          n++;
          throw new RetryableError("nope");
        },
        { retries: 2, baseMs: 1 },
      ),
    ).rejects.toThrow(/nope/);
    expect(n).toBe(3); // initial + 2 retries
  });

  it("does not retry non-retryable errors", async () => {
    let n = 0;
    await expect(
      withBackoff(
        async () => {
          n++;
          throw new Error("boom");
        },
        { retries: 3, baseMs: 1 },
      ),
    ).rejects.toThrow(/boom/);
    expect(n).toBe(1);
  });
});

describe("encryptToken / decryptToken (round-trip)", () => {
  it("encrypts and decrypts a refresh token", async () => {
    const original = "1//0e-fake-refresh-token";
    const ct = await encryptToken(original);
    expect(ct).not.toContain(original);
    expect(await decryptToken(ct)).toBe(original);
  });

  it("produces different ciphertexts for the same plaintext", async () => {
    const a = await encryptToken("same");
    const b = await encryptToken("same");
    expect(a).not.toBe(b);
  });
});
