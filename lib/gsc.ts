// Google Search Console OAuth + Search Analytics client.
// Edge-runtime safe (Web Crypto + fetch only — no Google SDK).
//
// Security notes:
//   * Refresh tokens are encrypted at rest via `encryptToken` (AES-256-GCM)
//     before being written to projects.gsc_refresh_token_enc.
//   * Access tokens live only in-process; never persisted, never returned to
//     the client.
//   * OAuth `state` is HMAC-signed with OAUTH_STATE_SECRET and carries a 10-min
//     expiry to prevent CSRF + replay.
//   * No token value is logged. The helpers below explicitly redact in errors.

export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
export const STATE_TTL_MS = 10 * 60 * 1000;

export interface OAuthStatePayload {
  projectId: string;
  userId: string;
  exp: number; // ms since epoch
}

// -------- state signing --------

export async function signState(payload: OAuthStatePayload): Promise<string> {
  const secret = requireEnv("OAUTH_STATE_SECRET");
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const mac = await hmac(secret, body);
  return `${body}.${mac}`;
}

export async function verifyState(state: string): Promise<OAuthStatePayload | null> {
  const secret = requireEnv("OAUTH_STATE_SECRET");
  const dot = state.indexOf(".");
  if (dot < 0) return null;
  const body = state.slice(0, dot);
  const mac = state.slice(dot + 1);
  const expected = await hmac(secret, body);
  if (!timingSafeEqual(mac, expected)) return null;
  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as OAuthStatePayload;
  } catch {
    return null;
  }
  if (!payload?.projectId || !payload?.userId || !payload?.exp) return null;
  if (Date.now() > payload.exp) return null;
  return payload;
}

// -------- authorize URL --------

export function buildAuthorizeUrl(state: string): string {
  const clientId = requireEnv("GSC_CLIENT_ID");
  const redirect = requireEnv("GSC_REDIRECT_URI");
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirect);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", GSC_SCOPE);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", state);
  return u.toString();
}

// -------- token exchange / refresh --------

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  scope: string;
  tokenType: string;
}

export async function exchangeCode(
  code: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<TokenExchangeResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    code,
    client_id: requireEnv("GSC_CLIENT_ID"),
    client_secret: requireEnv("GSC_CLIENT_SECRET"),
    redirect_uri: requireEnv("GSC_REDIRECT_URI"),
    grant_type: "authorization_code",
  });
  const r = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    // Don't echo the response body verbatim — it can contain the code/error
    // description with PII. Surface status + sanitized error key only.
    const safe = await safeErrorTag(r);
    throw new Error(`gsc token exchange failed (${r.status} ${safe})`);
  }
  const data = (await r.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in,
    scope: data.scope,
    tokenType: data.token_type,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<{ accessToken: string; expiresIn: number }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: requireEnv("GSC_CLIENT_ID"),
    client_secret: requireEnv("GSC_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
  const r = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    const safe = await safeErrorTag(r);
    throw new Error(`gsc token refresh failed (${r.status} ${safe})`);
  }
  const data = (await r.json()) as { access_token: string; expires_in: number };
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

// -------- sites list + property resolution --------

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

export async function listSites(
  accessToken: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<GscSite[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const r = await fetchImpl("https://searchconsole.googleapis.com/webmasters/v3/sites", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    const safe = await safeErrorTag(r);
    throw new Error(`gsc list sites failed (${r.status} ${safe})`);
  }
  const data = (await r.json()) as { siteEntry?: GscSite[] };
  return data.siteEntry ?? [];
}

// Pick the GSC property that best matches a project's domain.
// GSC properties come in two forms: URL-prefix (`https://example.com/`) and
// domain (`sc-domain:example.com`). Prefer the domain property when verified.
export function pickPropertyForDomain(sites: GscSite[], domain: string): GscSite | null {
  const host = normalizeHost(domain);
  const verified = sites.filter(
    (s) => s.permissionLevel && s.permissionLevel !== "siteUnverifiedUser",
  );
  const domainProp = verified.find((s) => s.siteUrl === `sc-domain:${host}`);
  if (domainProp) return domainProp;
  const urlProp = verified.find((s) => {
    try {
      return new URL(s.siteUrl).host === host;
    } catch {
      return false;
    }
  });
  return urlProp ?? null;
}

function normalizeHost(input: string): string {
  const trimmed = input.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return trimmed.replace(/^www\./i, "").toLowerCase();
}

// -------- Search Analytics query --------

export interface FetchGscPositionInput {
  refreshToken: string;     // PLAINTEXT — caller is responsible for decrypting
  siteUrl: string;          // exact GSC site URL (`https://example.com/` or `sc-domain:example.com`)
  keyword: string;
  daysBack?: number;        // default 7
  fetchImpl?: typeof fetch;
  /** ISO date used as "today". Useful for tests. */
  now?: Date;
  /** Override retry behavior in tests. */
  retries?: number;
}

/**
 * Returns the avg. position (rounded) for a keyword in the date window, or
 * null if GSC has no rows for that query. Throws on auth/network failure
 * after retries are exhausted.
 */
export async function fetchGscPosition(input: FetchGscPositionInput): Promise<number | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const now = input.now ?? new Date();
  const daysBack = input.daysBack ?? 7;
  // GSC data lags ~2 days; shift the window accordingly.
  const endDate = isoDate(addDays(now, -2));
  const startDate = isoDate(addDays(now, -2 - daysBack));

  const { accessToken } = await withBackoff(
    () => refreshAccessToken(input.refreshToken, { fetchImpl }),
    { retries: input.retries ?? 3 },
  );

  const body = {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: 1,
    dimensionFilterGroups: [
      { filters: [{ dimension: "query", operator: "equals", expression: input.keyword }] },
    ],
  };

  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`;

  const data = await withBackoff(
    async () => {
      const r = await fetchImpl(url, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.status === 429 || r.status >= 500) {
        // surface as retryable
        const tag = await safeErrorTag(r);
        throw new RetryableError(`gsc query ${r.status} ${tag}`);
      }
      if (!r.ok) {
        const tag = await safeErrorTag(r);
        throw new Error(`gsc query failed (${r.status} ${tag})`);
      }
      return (await r.json()) as { rows?: { position?: number }[] };
    },
    { retries: input.retries ?? 3 },
  );

  const pos = data.rows?.[0]?.position;
  if (typeof pos !== "number") return null;
  return Math.round(pos);
}

// -------- retry / backoff --------

export class RetryableError extends Error {}

interface BackoffOpts {
  retries?: number;
  baseMs?: number;
}

export async function withBackoff<T>(fn: () => Promise<T>, opts: BackoffOpts = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const base = opts.baseMs ?? 400;
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof RetryableError;
      if (!retryable || i === retries) break;
      const jitter = Math.floor(Math.random() * base);
      const delay = base * Math.pow(2, i) + jitter;
      await sleep(delay);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("backoff: unknown error");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// -------- small helpers --------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

async function hmac(secretHex: string, message: string): Promise<string> {
  const keyBytes = hexToBytes(secretHex);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const msg = new TextEncoder().encode(message);
  const sig = await crypto.subtle.sign("HMAC", key, msg.buffer as ArrayBuffer);
  return b64url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const c of bytes) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const norm = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(norm);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + days);
  return c;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function safeErrorTag(r: Response): Promise<string> {
  // Read at most a few hundred bytes and only return a small error key, never
  // the raw body — Google can echo tokens or PII in some error responses.
  try {
    const text = await r.text();
    const m = text.match(/"error"\s*:\s*"([^"]+)"/) ?? text.match(/"status"\s*:\s*"([^"]+)"/);
    return (m?.[1] ?? "error").slice(0, 40);
  } catch {
    return "error";
  }
}
