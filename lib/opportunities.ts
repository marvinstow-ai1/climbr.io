// Opportunity detection.
//
// Pulls last-28-day Search Analytics rows (query + page) from GSC and runs
// the project's pages/keywords through a set of heuristics:
//
//   - high_impressions_low_ctr   — visible but not clicked
//   - striking_distance          — position 8..20 ("almost on page 1")
//   - declining_clicks           — clicks down >30% vs. previous 28-day window
//   - stagnant_impressions       — many impressions, zero clicks, page <30
//   - missing_meta               — looks like a page without a sane title
//
// When GSC is not connected (or MOCK_GSC=true) we fall back to a small
// deterministic mock dataset so the UI flows are testable end-to-end.

import { refreshAccessToken, withBackoff, RetryableError } from "./gsc.js";

export type OpportunityType =
  | "high_impressions_low_ctr"
  | "striking_distance"
  | "declining_clicks"
  | "stagnant_impressions"
  | "missing_meta";

export interface OpportunityRow {
  type: OpportunityType;
  page_url: string | null;
  query: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  priority: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  score: number;
  data: Record<string, unknown>;
}

export interface DetectInput {
  /** PLAINTEXT refresh token — caller decrypts; null when GSC unavailable. */
  refreshToken: string | null;
  siteUrl: string | null;
  fetchImpl?: typeof fetch;
  now?: Date;
}

interface GscQueryRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

const PERIOD_DAYS = 28;

export async function detectOpportunities(input: DetectInput): Promise<OpportunityRow[]> {
  const useMock = !input.refreshToken || !input.siteUrl
    || (process.env.MOCK_GSC ?? "").toLowerCase() === "true";

  const current = useMock ? mockRows(0) : await fetchSearchAnalytics(input, 0);
  const previous = useMock ? mockRows(PERIOD_DAYS) : await fetchSearchAnalytics(input, PERIOD_DAYS);
  return rank([
    ...findHighImpressionsLowCtr(current),
    ...findStrikingDistance(current),
    ...findDecliningClicks(current, previous),
    ...findStagnantImpressions(current),
  ]);
}

// ---------- detectors ----------

function findHighImpressionsLowCtr(rows: GscQueryRow[]): OpportunityRow[] {
  return rows
    .filter((r) => r.impressions >= 100 && r.ctr < 0.02 && r.position <= 30)
    .slice(0, 20)
    .map((r) => ({
      type: "high_impressions_low_ctr" as const,
      page_url: pickPage(r),
      query: pickQuery(r),
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: round4(r.ctr),
      position: round2(r.position),
      priority: r.impressions >= 500 ? "high" : "medium",
      impact: "high",
      effort: "low",
      score: Math.round(r.impressions * (0.06 - r.ctr) * 100),
      data: { reason: "Viele Impressionen, kaum Klicks — Titel/Beschreibung optimieren." },
    }));
}

function findStrikingDistance(rows: GscQueryRow[]): OpportunityRow[] {
  return rows
    .filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= 30)
    .slice(0, 20)
    .map((r) => ({
      type: "striking_distance" as const,
      page_url: pickPage(r),
      query: pickQuery(r),
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: round4(r.ctr),
      position: round2(r.position),
      priority: r.position <= 12 ? "high" : "medium",
      impact: "high",
      effort: "medium",
      score: Math.round((21 - r.position) * 10 + r.impressions / 10),
      data: { reason: "Knapp vor der ersten Seite — gezielte On-Page-Optimierung kann den Sprung bringen." },
    }));
}

function findDecliningClicks(curr: GscQueryRow[], prev: GscQueryRow[]): OpportunityRow[] {
  const prevByKey = new Map<string, GscQueryRow>();
  for (const r of prev) prevByKey.set(r.keys.join("|"), r);
  const out: OpportunityRow[] = [];
  for (const r of curr) {
    const p = prevByKey.get(r.keys.join("|"));
    if (!p || p.clicks < 10) continue;
    const drop = (p.clicks - r.clicks) / p.clicks;
    if (drop < 0.3) continue;
    out.push({
      type: "declining_clicks",
      page_url: pickPage(r),
      query: pickQuery(r),
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: round4(r.ctr),
      position: round2(r.position),
      priority: drop >= 0.5 ? "high" : "medium",
      impact: "medium",
      effort: "medium",
      score: Math.round(drop * 100 + p.clicks),
      data: {
        reason: "Klicks deutlich gesunken im Vergleich zur Vorperiode.",
        previousClicks: p.clicks,
        currentClicks: r.clicks,
        dropPct: Math.round(drop * 100),
      },
    });
  }
  return out.slice(0, 20);
}

function findStagnantImpressions(rows: GscQueryRow[]): OpportunityRow[] {
  return rows
    .filter((r) => r.clicks === 0 && r.impressions >= 200 && r.position <= 40)
    .slice(0, 20)
    .map((r) => ({
      type: "stagnant_impressions" as const,
      page_url: pickPage(r),
      query: pickQuery(r),
      impressions: r.impressions,
      clicks: 0,
      ctr: 0,
      position: round2(r.position),
      priority: "medium",
      impact: "medium",
      effort: "low",
      score: Math.round(r.impressions / 10),
      data: { reason: "Sichtbar, aber niemand klickt — Snippet überarbeiten." },
    }));
}

// ---------- ranking + helpers ----------

function rank(rows: OpportunityRow[]): OpportunityRow[] {
  return rows.sort((a, b) => b.score - a.score);
}

function pickPage(r: GscQueryRow): string | null {
  return r.keys[0]?.startsWith("http") ? r.keys[0] : r.keys[1] ?? null;
}
function pickQuery(r: GscQueryRow): string | null {
  return r.keys[0]?.startsWith("http") ? r.keys[1] ?? null : r.keys[0] ?? null;
}
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

// ---------- GSC fetch ----------

async function fetchSearchAnalytics(input: DetectInput, offsetDays: number): Promise<GscQueryRow[]> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const now = input.now ?? new Date();
  const endDate = isoDate(addDays(now, -2 - offsetDays));
  const startDate = isoDate(addDays(now, -2 - offsetDays - PERIOD_DAYS));

  const { accessToken } = await withBackoff(
    () => refreshAccessToken(input.refreshToken!, { fetchImpl }),
    { retries: 3 },
  );

  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(input.siteUrl!)}/searchAnalytics/query`;
  const body = {
    startDate,
    endDate,
    dimensions: ["query", "page"],
    rowLimit: 200,
  };

  return withBackoff(
    async () => {
      const r = await fetchImpl(url, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.status === 429 || r.status >= 500) throw new RetryableError(`gsc ${r.status}`);
      if (!r.ok) throw new Error(`gsc query failed (${r.status})`);
      const data = (await r.json()) as { rows?: GscQueryRow[] };
      return data.rows ?? [];
    },
    { retries: 3 },
  );
}

function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + days);
  return c;
}
function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

// ---------- mock ----------

function mockRows(offsetDays: number): GscQueryRow[] {
  const variance = offsetDays > 0 ? 1.25 : 1; // older window = slightly more clicks (to surface declining_clicks)
  const seeds: { query: string; page: string; impressions: number; clicks: number; position: number }[] = [
    { query: "yoga matte kaufen", page: "https://example.de/produkte/yoga-matte", impressions: 1820, clicks: 18, position: 11.4 },
    { query: "yoga matte test", page: "https://example.de/blog/yoga-matte-test", impressions: 980, clicks: 6, position: 9.2 },
    { query: "yoga matte berlin", page: "https://example.de/standorte/berlin", impressions: 410, clicks: 0, position: 16.1 },
    { query: "yoga zubehör günstig", page: "https://example.de/zubehoer", impressions: 1250, clicks: 8, position: 14.7 },
    { query: "rutschfeste yoga matte", page: "https://example.de/produkte/rutschfest", impressions: 530, clicks: 22, position: 4.1 },
    { query: "yoga matte für anfänger", page: "https://example.de/ratgeber/anfaenger", impressions: 740, clicks: 36, position: 7.3 },
    { query: "yoga matte naturkautschuk", page: "https://example.de/produkte/naturkautschuk", impressions: 280, clicks: 0, position: 22.8 },
    { query: "yoga matte reinigen", page: "https://example.de/blog/reinigung", impressions: 1610, clicks: 19, position: 8.6 },
  ];
  return seeds.map((s) => ({
    keys: [s.query, s.page],
    impressions: Math.round(s.impressions * variance),
    clicks: Math.round(s.clicks * variance),
    ctr: s.impressions === 0 ? 0 : Math.round(s.clicks * variance) / (s.impressions * variance),
    position: s.position,
  }));
}
