// DataForSEO API client.
// Edge-runtime safe. Credentials are loaded server-side from environment
// variables (`DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD`) — never exposed to
// the client, never per-user. Used by the Opportunity Finder and the Brief
// Generator for related-keyword / search-volume lookups.
//
// Falls back to a deterministic mock dataset when:
//   - MOCK_DATAFORSEO=true, OR
//   - env credentials are missing.

export interface KeywordIdea {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null;
}

export interface DataForSeoOptions {
  fetchImpl?: typeof fetch;
}

const ENDPOINT_LIVE = "https://api.dataforseo.com";

export function serverCredentials(): string | null {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return `${login}:${password}`;
}

function isMock(creds: string | null): boolean {
  if ((process.env.MOCK_DATAFORSEO ?? "").toLowerCase() === "true") return true;
  return !creds || creds.indexOf(":") < 0;
}

function basicAuth(credentials: string): string {
  return `Basic ${btoa(credentials)}`;
}

// ---------- keyword ideas (related keywords + volume) ----------

export async function keywordIdeas(
  seed: string,
  location: "de" | "at" | "ch" = "de",
  opts: DataForSeoOptions = {},
): Promise<KeywordIdea[]> {
  const creds = serverCredentials();
  if (isMock(creds)) return mockKeywordIdeas(seed);

  const fetchImpl = opts.fetchImpl ?? fetch;
  const body = [
    {
      keywords: [seed],
      location_code: locationCode(location),
      language_code: "de",
      limit: 25,
    },
  ];
  const r = await fetchImpl(`${ENDPOINT_LIVE}/v3/keywords_data/google_ads/keywords_for_keywords/live`, {
    method: "POST",
    headers: {
      authorization: basicAuth(creds!),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`dataforseo keywords_for_keywords failed (${r.status})`);
  const data = (await r.json()) as {
    tasks?: { result?: { keyword: string; search_volume?: number; cpc?: number; competition?: number }[] }[];
  };
  const rows = data.tasks?.[0]?.result ?? [];
  return rows.map((row) => ({
    keyword: row.keyword,
    searchVolume: row.search_volume ?? null,
    cpc: row.cpc ?? null,
    competition: row.competition ?? null,
  }));
}

// ---------- server-side connection check ----------

export async function pingServerDataForSeo(opts: { fetchImpl?: typeof fetch } = {}): Promise<{ ok: boolean; configured: boolean }> {
  const creds = serverCredentials();
  if (!creds) return { ok: false, configured: false };
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const r = await fetchImpl(`${ENDPOINT_LIVE}/v3/appendix/user_data`, {
      headers: { authorization: basicAuth(creds) },
    });
    return { ok: r.ok, configured: true };
  } catch {
    return { ok: false, configured: true };
  }
}

// ---------- helpers ----------

function locationCode(loc: "de" | "at" | "ch"): number {
  // DataForSEO location codes
  if (loc === "at") return 2040;
  if (loc === "ch") return 2756;
  return 2276; // Germany
}

function mockKeywordIdeas(seed: string): KeywordIdea[] {
  const base = seed.toLowerCase().trim();
  const suffixes = [
    "günstig",
    "kaufen",
    "online",
    "test",
    "vergleich",
    "berlin",
    "münchen",
    "wien",
    "zürich",
    "preis",
    "anbieter",
    "in der nähe",
    "anleitung",
    "tipps",
    "erfahrungen",
  ];
  return suffixes.map((s, i) => ({
    keyword: `${base} ${s}`,
    searchVolume: Math.max(40, 1200 - i * 70),
    cpc: Number((0.4 + (i % 5) * 0.3).toFixed(2)),
    competition: Number(((i % 10) / 10).toFixed(2)),
  }));
}
