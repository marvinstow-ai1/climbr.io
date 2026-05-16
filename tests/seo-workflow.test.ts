import { describe, expect, it, beforeEach } from "vitest";
import { detectOpportunities } from "../lib/opportunities.js";
import { taskFromOpportunity } from "../lib/seoTasks.js";
import { generateBrief } from "../lib/briefs.js";
import { keywordIdeas } from "../lib/dataforseo.js";

describe("opportunity detector (mock GSC)", () => {
  beforeEach(() => {
    process.env.MOCK_GSC = "true";
  });

  it("returns at least one ranked opportunity from the mock dataset", async () => {
    const rows = await detectOpportunities({ refreshToken: null, siteUrl: null });
    expect(rows.length).toBeGreaterThan(0);
    // Highest-scoring opportunity is always first.
    expect(rows[0]!.score).toBeGreaterThanOrEqual(rows[rows.length - 1]!.score);
    // We expect at least the high-impressions-low-CTR detector to fire.
    expect(rows.some((r) => r.type === "high_impressions_low_ctr")).toBe(true);
  });

  it("includes a German reason string in data", async () => {
    const rows = await detectOpportunities({ refreshToken: null, siteUrl: null });
    expect(rows.every((r) => typeof r.data.reason === "string" && (r.data.reason as string).length > 0)).toBe(true);
  });
});

describe("taskFromOpportunity", () => {
  it("produces German task copy for each opportunity type", () => {
    const types = [
      "high_impressions_low_ctr",
      "striking_distance",
      "declining_clicks",
      "stagnant_impressions",
      "missing_meta",
    ] as const;
    for (const type of types) {
      const t = taskFromOpportunity({
        type,
        page_url: "https://example.de/seite",
        query: "yoga matte",
        impressions: 500,
        clicks: 5,
        position: 12,
        ctr: 0.01,
        data: { dropPct: 40 },
      });
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.suggested_action.length).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(t.effort);
    }
  });
});

describe("generateBrief (mock OpenAI)", () => {
  beforeEach(() => {
    process.env.USE_MOCK_AI = "true";
    delete process.env.OPENAI_API_KEY;
  });

  it("returns a structured brief with German page structure", async () => {
    const brief = await generateBrief({ keyword: "yoga matte naturkautschuk", locale: "de" });
    expect(brief.keyword).toBe("yoga matte naturkautschuk");
    expect(brief.secondaryKeywords.length).toBeGreaterThan(0);
    expect(brief.pageStructure.length).toBeGreaterThan(0);
    expect(brief.h1.length).toBeGreaterThan(0);
    expect(brief.faq.length).toBeGreaterThan(0);
  });

  it("classifies transactional intent for 'kaufen'-style keywords", async () => {
    const brief = await generateBrief({ keyword: "yoga matte kaufen", locale: "de" });
    expect(brief.intent).toBe("transactional");
  });
});

describe("dataforseo keywordIdeas (mock)", () => {
  beforeEach(() => {
    process.env.MOCK_DATAFORSEO = "true";
  });

  it("returns at least 10 mock ideas for a seed keyword", async () => {
    const ideas = await keywordIdeas("friseur");
    expect(ideas.length).toBeGreaterThanOrEqual(10);
    expect(ideas[0]!.keyword.startsWith("friseur")).toBe(true);
    expect(typeof ideas[0]!.searchVolume).toBe("number");
  });
});
