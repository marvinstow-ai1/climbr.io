// DataForSEO API client.
// Edge-runtime safe. Mockable via MOCK_DATAFORSEO=true (default when no
// credentials are present). Used by the Opportunity Finder and the Brief
// Generator for related-keyword / search-volume lookups.
//
// The DataForSEO Sandbox uses HTTP Basic auth: `login:password` base64.
// We store the joined `login:password` string encrypted at rest in the
// `integrations.credentials_enc` column and pass it as the basic-auth
// secret here at request time.

export interface KeywordIdea {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null;
}

export interface DataForSeoOptions {
  /** "login:password" — caller is responsible for decryption. */
  credentials?: string | null;
  fetchImpl?: typeof fetch;
}

const ENDPOINT_LIVE = "https://api.dataforseo.com";

function isMock(opts: DataForSeoOptions): boolean {
  if ((process.env.MOCK_DATAFORSEO ?? "").toLowerCase() === "true") return true;
  return !opts.credentials || opts.credentials.indexOf(":") < 0;
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
  if (isMock(opts)) return mockKeywordIdeas(seed);

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
      authorization: basicAuth(opts.credentials!),
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

// ---------- credential test ----------

export async function pingDataForSeo(credentials: string, opts: { fetchImpl?: typeof fetch } = {}): Promise<boolean> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const r = await fetchImpl(`${ENDPOINT_LIVE}/v3/appendix/user_data`, {
      headers: { authorization: basicAuth(credentials) },
    });
    return r.ok;
  } catch {
    return false;
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
