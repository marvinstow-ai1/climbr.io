// DataForSEO REST API client (server-only).
//
// Security:
//   * Credentials are read from env vars (DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD)
//     and used to build a Basic-auth header. Never exposed to the client.
//   * Optional caching layer (Supabase `dataforseo_cache`) to minimize cost.
//   * USE_MOCK_DATAFORSEO=true bypasses the network and returns deterministic
//     mock data — useful for local development without paying for API calls.
//
// Edge-runtime safe (uses fetch + Web Crypto + btoa).

import type { SupabaseClient } from "@supabase/supabase-js";

const BASE = "https://api.dataforseo.com/v3";

export type Locale = "de" | "en";

export interface DataForSeoOptions {
  fetchImpl?: typeof fetch;
  /** Cache TTL in seconds. 0 disables caching for this call. */
  cacheTtlSeconds?: number;
  /** Pass a Supabase client to enable the cache. Without it, calls always hit the network. */
  db?: SupabaseClient;
  /** Per-call override; otherwise read from env USE_MOCK_DATAFORSEO. */
  mock?: boolean;
}

export class DataForSeoError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// -------- low-level HTTP --------

interface ApiTask<T> {
  status_code: number;
  status_message: string;
  result?: T[];
}
interface ApiEnvelope<T> {
  status_code: number;
  status_message: string;
  tasks?: ApiTask<T>[];
}

function isMockEnabled(opt?: boolean): boolean {
  if (typeof opt === "boolean") return opt;
  return process.env.USE_MOCK_DATAFORSEO === "true";
}

function authHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new DataForSeoError(
      "DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD missing in env",
      500,
      "MISSING_CREDENTIALS",
    );
  }
  return `Basic ${btoa(`${login}:${password}`)}`;
}

async function rawPost<T>(
  path: string,
  body: unknown,
  opts: DataForSeoOptions,
): Promise<T[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const r = await fetchImpl(`${BASE}${path}`, {
    method: "POST",
    headers: {
      authorization: authHeader(),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const tag = await safeErrorTag(r);
    throw new DataForSeoError(
      `dataforseo ${path} failed (${r.status} ${tag})`,
      r.status,
      "HTTP_ERROR",
    );
  }
  const data = (await r.json()) as ApiEnvelope<T>;
  if (data.status_code !== 20000) {
    throw new DataForSeoError(
      `dataforseo ${path}: ${data.status_message}`,
      data.status_code,
      "API_ERROR",
    );
  }
  const task = data.tasks?.[0];
  if (!task) return [];
  if (task.status_code !== 20000 && task.status_code !== 20100) {
    throw new DataForSeoError(
      `dataforseo task error: ${task.status_message}`,
      task.status_code,
      "TASK_ERROR",
    );
  }
  return task.result ?? [];
}

async function safeErrorTag(r: Response): Promise<string> {
  try {
    const t = await r.text();
    return t.slice(0, 120);
  } catch {
    return "error";
  }
}

// -------- cache helper --------

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input).buffer as ArrayBuffer,
  );
  const bytes = new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

async function cachedCall<T>(
  endpoint: string,
  payload: unknown,
  opts: DataForSeoOptions,
  fn: () => Promise<T>,
): Promise<T> {
  const ttl = opts.cacheTtlSeconds ?? 0;
  if (!opts.db || ttl <= 0) return fn();

  const key = await sha256Hex(`${endpoint}::${JSON.stringify(payload)}`);
  const nowIso = new Date().toISOString();

  const { data: hit } = await opts.db
    .from("dataforseo_cache")
    .select("response, expires_at")
    .eq("cache_key", key)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (hit) return hit.response as T;

  const fresh = await fn();
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  await opts.db.from("dataforseo_cache").upsert(
    {
      cache_key: key,
      endpoint,
      payload: payload as object,
      response: fresh as object,
      expires_at: expiresAt,
    },
    { onConflict: "cache_key" },
  );
  return fresh;
}

// -------- locale helpers --------

export function locationCodeFor(locale: Locale): number {
  // DataForSEO location_code: Germany=2276, USA=2840.
  return locale === "de" ? 2276 : 2840;
}

export function languageCodeFor(locale: Locale): string {
  return locale === "de" ? "de" : "en";
}

// -------- SERP API: Google Organic --------

export interface SerpResultItem {
  position: number;
  title: string;
  url: string;
  domain: string;
  snippet: string | null;
}

export async function fetchSerpResults(
  keyword: string,
  locale: Locale,
  opts: DataForSeoOptions = {},
): Promise<SerpResultItem[]> {
  if (isMockEnabled(opts.mock)) {
    return mockSerp(keyword);
  }
  const payload = [
    {
      keyword,
      location_code: locationCodeFor(locale),
      language_code: languageCodeFor(locale),
      device: "desktop",
      depth: 10,
    },
  ];
  return cachedCall("serp.google.organic", payload, opts, async () => {
    const result = await rawPost<{
      items?: {
        type: string;
        rank_absolute?: number;
        title?: string;
        url?: string;
        domain?: string;
        description?: string;
      }[];
    }>("/serp/google/organic/live/advanced", payload, opts);
    const items = result[0]?.items ?? [];
    const out: SerpResultItem[] = [];
    for (const it of items) {
      if (it.type !== "organic") continue;
      if (out.length >= 10) break;
      out.push({
        position: it.rank_absolute ?? out.length + 1,
        title: it.title ?? "",
        url: it.url ?? "",
        domain: it.domain ?? "",
        snippet: it.description ?? null,
      });
    }
    return out;
  });
}

// -------- Keywords Data API: search volume / CPC / competition --------

export interface KeywordMetrics {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: number | null; // 0..1
  keyword_difficulty: number | null; // 0..100
}

export async function fetchKeywordMetrics(
  keywords: string[],
  locale: Locale,
  opts: DataForSeoOptions = {},
): Promise<KeywordMetrics[]> {
  if (keywords.length === 0) return [];
  if (isMockEnabled(opts.mock)) {
    return keywords.map(mockMetrics);
  }
  const payload = [
    {
      keywords,
      location_code: locationCodeFor(locale),
      language_code: languageCodeFor(locale),
    },
  ];
  return cachedCall("keywords.search_volume", payload, opts, async () => {
    const result = await rawPost<{
      keyword: string;
      search_volume?: number;
      cpc?: number;
      competition?: number;
      keyword_difficulty?: number;
    }>("/keywords_data/google_ads/search_volume/live", payload, opts);
    const map = new Map<string, KeywordMetrics>();
    for (const r of result) {
      map.set(r.keyword.toLowerCase(), {
        keyword: r.keyword,
        search_volume: r.search_volume ?? null,
        cpc: r.cpc ?? null,
        competition: r.competition ?? null,
        keyword_difficulty: r.keyword_difficulty ?? null,
      });
    }
    return keywords.map(
      (k) =>
        map.get(k.toLowerCase()) ?? {
          keyword: k,
          search_volume: null,
          cpc: null,
          competition: null,
          keyword_difficulty: null,
        },
    );
  });
}

// -------- Related / suggested keywords --------

export async function fetchRelatedKeywords(
  seed: string,
  locale: Locale,
  opts: DataForSeoOptions = {},
): Promise<KeywordMetrics[]> {
  if (isMockEnabled(opts.mock)) {
    return mockRelated(seed);
  }
  const payload = [
    {
      keyword: seed,
      location_code: locationCodeFor(locale),
      language_code: languageCodeFor(locale),
      limit: 20,
    },
  ];
  return cachedCall("keywords.related", payload, opts, async () => {
    const result = await rawPost<{
      items?: {
        keyword_data?: {
          keyword: string;
          keyword_info?: {
            search_volume?: number;
            cpc?: number;
            competition?: number;
          };
          keyword_properties?: { keyword_difficulty?: number };
        };
      }[];
    }>("/dataforseo_labs/google/related_keywords/live", payload, opts);
    const items = result[0]?.items ?? [];
    return items
      .map((it) => it.keyword_data)
      .filter((k): k is NonNullable<typeof k> => Boolean(k))
      .map(
        (k): KeywordMetrics => ({
          keyword: k.keyword,
          search_volume: k.keyword_info?.search_volume ?? null,
          cpc: k.keyword_info?.cpc ?? null,
          competition: k.keyword_info?.competition ?? null,
          keyword_difficulty: k.keyword_properties?.keyword_difficulty ?? null,
        }),
      )
      .slice(0, 20);
  });
}

// -------- Domain Analytics: organic overview --------

export interface DomainOverview {
  domain: string;
  organic_keywords_count: number | null;
  organic_traffic: number | null;
  paid_traffic: number | null;
}

export async function fetchDomainOverview(
  domain: string,
  locale: Locale,
  opts: DataForSeoOptions = {},
): Promise<DomainOverview> {
  if (isMockEnabled(opts.mock)) {
    return mockDomainOverview(domain);
  }
  const payload = [
    {
      target: domain,
      location_code: locationCodeFor(locale),
      language_code: languageCodeFor(locale),
    },
  ];
  return cachedCall("domain.overview", payload, opts, async () => {
    const result = await rawPost<{
      items?: {
        metrics?: {
          organic?: {
            count?: number;
            etv?: number; // estimated traffic volume
          };
          paid?: { etv?: number };
        };
      }[];
    }>("/dataforseo_labs/google/domain_metrics_by_categories/live", payload, opts).catch(
      // Fall back to the historical-overview endpoint if the primary one returns 404.
      () =>
        rawPost<{
          items?: {
            metrics?: {
              organic?: { count?: number; etv?: number };
              paid?: { etv?: number };
            };
          }[];
        }>("/dataforseo_labs/google/historical_keyword_data/live", payload, opts),
    );
    const m = result[0]?.items?.[0]?.metrics;
    return {
      domain,
      organic_keywords_count: m?.organic?.count ?? null,
      organic_traffic: m?.organic?.etv != null ? Math.round(m.organic.etv) : null,
      paid_traffic: m?.paid?.etv != null ? Math.round(m.paid.etv) : null,
    };
  });
}

// -------- Domain organic keywords (top ranking) --------

export interface DomainKeywordRow {
  keyword: string;
  position: number;
  search_volume: number | null;
  traffic: number | null;
  url: string | null;
}

export async function fetchDomainKeywords(
  domain: string,
  locale: Locale,
  opts: DataForSeoOptions = {},
): Promise<DomainKeywordRow[]> {
  if (isMockEnabled(opts.mock)) {
    return mockDomainKeywords(domain);
  }
  const payload = [
    {
      target: domain,
      location_code: locationCodeFor(locale),
      language_code: languageCodeFor(locale),
      limit: 25,
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
    },
  ];
  return cachedCall("domain.ranked_keywords", payload, opts, async () => {
    const result = await rawPost<{
      items?: {
        keyword_data?: {
          keyword: string;
          keyword_info?: { search_volume?: number };
        };
        ranked_serp_element?: {
          serp_item?: { rank_absolute?: number; url?: string; etv?: number };
        };
      }[];
    }>("/dataforseo_labs/google/ranked_keywords/live", payload, opts);
    const items = result[0]?.items ?? [];
    return items.slice(0, 25).map((it) => ({
      keyword: it.keyword_data?.keyword ?? "",
      position: it.ranked_serp_element?.serp_item?.rank_absolute ?? 0,
      search_volume: it.keyword_data?.keyword_info?.search_volume ?? null,
      traffic: it.ranked_serp_element?.serp_item?.etv != null
        ? Math.round(it.ranked_serp_element.serp_item.etv) : null,
      url: it.ranked_serp_element?.serp_item?.url ?? null,
    }));
  });
}

// -------- Top competing domains --------

export interface CompetingDomain {
  domain: string;
  intersections: number;
  organic_traffic: number | null;
}

export async function fetchTopCompetitors(
  domain: string,
  locale: Locale,
  opts: DataForSeoOptions = {},
): Promise<CompetingDomain[]> {
  if (isMockEnabled(opts.mock)) {
    return mockCompetitors(domain);
  }
  const payload = [
    {
      target: domain,
      location_code: locationCodeFor(locale),
      language_code: languageCodeFor(locale),
      limit: 10,
    },
  ];
  return cachedCall("domain.competitors", payload, opts, async () => {
    const result = await rawPost<{
      items?: {
        domain?: string;
        intersections?: number;
        full_domain_metrics?: { organic?: { etv?: number } };
      }[];
    }>("/dataforseo_labs/google/competitors_domain/live", payload, opts);
    const items = result[0]?.items ?? [];
    return items.slice(0, 10).map((it) => ({
      domain: it.domain ?? "",
      intersections: it.intersections ?? 0,
      organic_traffic: it.full_domain_metrics?.organic?.etv != null
        ? Math.round(it.full_domain_metrics.organic.etv) : null,
    }));
  });
}

// -------- Backlinks summary --------

export interface BacklinksSummary {
  backlinks: number | null;
  referring_domains: number | null;
  rank: number | null;
}

export async function fetchBacklinksSummary(
  domain: string,
  opts: DataForSeoOptions = {},
): Promise<BacklinksSummary> {
  if (isMockEnabled(opts.mock)) {
    return mockBacklinks(domain);
  }
  const payload = [{ target: domain, include_subdomains: true }];
  return cachedCall("backlinks.summary", payload, opts, async () => {
    const result = await rawPost<{
      backlinks?: number;
      referring_domains?: number;
      rank?: number;
    }>("/backlinks/summary/live", payload, opts);
    const row = result[0];
    return {
      backlinks: row?.backlinks ?? null,
      referring_domains: row?.referring_domains ?? null,
      rank: row?.rank ?? null,
    };
  });
}

// -------- Keyword SERP position for a domain (used by ranking cron) --------

export async function fetchDomainPositionForKeyword(
  keyword: string,
  domain: string,
  locale: Locale,
  opts: DataForSeoOptions = {},
): Promise<number | null> {
  const serp = await fetchSerpResults(keyword, locale, opts);
  const normalized = normalizeHost(domain);
  for (const r of serp) {
    if (normalizeHost(r.domain) === normalized) return r.position;
  }
  return null;
}

function normalizeHost(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

// -------- mock fixtures (only used when USE_MOCK_DATAFORSEO=true) --------

function seededInt(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

function mockSerp(keyword: string): SerpResultItem[] {
  return Array.from({ length: 10 }, (_, i) => ({
    position: i + 1,
    title: `${keyword} — Result #${i + 1}`,
    url: `https://example${i + 1}.com/${encodeURIComponent(keyword)}`,
    domain: `example${i + 1}.com`,
    snippet: `Mock snippet ${i + 1} for "${keyword}".`,
  }));
}

function mockMetrics(keyword: string): KeywordMetrics {
  return {
    keyword,
    search_volume: seededInt(keyword, 50, 50000),
    cpc: Math.round((seededInt(keyword + "c", 10, 800) / 100) * 100) / 100,
    competition: Math.round(seededInt(keyword + "x", 5, 95)) / 100,
    keyword_difficulty: seededInt(keyword + "d", 5, 90),
  };
}

function mockRelated(seed: string): KeywordMetrics[] {
  const suffixes = [
    "online kaufen", "test", "vergleich", "kostenlos", "preis", "anleitung",
    "erfahrungen", "günstig", "alternative", "deutsch",
  ];
  return suffixes.map((s) => mockMetrics(`${seed} ${s}`));
}

function mockDomainOverview(domain: string): DomainOverview {
  return {
    domain,
    organic_keywords_count: seededInt(domain + "k", 200, 50000),
    organic_traffic: seededInt(domain + "t", 500, 200000),
    paid_traffic: seededInt(domain + "p", 0, 5000),
  };
}

function mockDomainKeywords(domain: string): DomainKeywordRow[] {
  return Array.from({ length: 15 }, (_, i) => ({
    keyword: `${domain.split(".")[0]} keyword ${i + 1}`,
    position: seededInt(domain + i, 1, 50),
    search_volume: seededInt(domain + i + "v", 100, 20000),
    traffic: seededInt(domain + i + "t", 10, 5000),
    url: `https://${domain}/page-${i + 1}`,
  }));
}

function mockCompetitors(domain: string): CompetingDomain[] {
  return Array.from({ length: 8 }, (_, i) => ({
    domain: `competitor${i + 1}-of-${domain.split(".")[0]}.com`,
    intersections: seededInt(domain + i + "ix", 5, 500),
    organic_traffic: seededInt(domain + i + "ot", 100, 80000),
  }));
}

function mockBacklinks(domain: string): BacklinksSummary {
  return {
    backlinks: seededInt(domain + "b", 100, 200000),
    referring_domains: seededInt(domain + "rd", 10, 5000),
    rank: seededInt(domain + "rk", 100, 900),
  };
}
