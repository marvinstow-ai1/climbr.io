import { describe, expect, it, beforeEach } from "vitest";
import { analyze } from "../lib/ai.js";
import { crawlUrl } from "../lib/crawl.js";

const FIXTURE = `<!doctype html>
<html lang="en">
  <head>
    <title>X</title>
  </head>
  <body>
    <img src="/a.jpg" />
    <img src="/b.jpg" />
  </body>
</html>`;

const fetchImpl: typeof fetch = async () =>
  new Response(FIXTURE, { status: 200, headers: { "content-type": "text/html" } });

describe("analyze (mock mode)", () => {
  beforeEach(() => {
    process.env.USE_MOCK_AI = "true";
    delete process.env.OPENAI_API_KEY;
  });

  it("returns a valid AiReport with topFixes when crawl shows problems", async () => {
    const crawl = await crawlUrl("https://example.com/", { fetchImpl });
    const report = await analyze({ crawl, locale: "en" });

    expect(report.model).toBe("mock");
    expect(report.locale).toBe("en");
    expect(report.topFixes.length).toBeGreaterThan(0);
    expect(report.topFixes.length).toBeLessThanOrEqual(5);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(report.topFixes.some((f) => f.title.toLowerCase().includes("title"))).toBe(true);
    expect(report.topFixes.some((f) => f.title.toLowerCase().includes("alt"))).toBe(true);
  });

  it("returns German copy when locale=de", async () => {
    const crawl = await crawlUrl("https://example.com/", { fetchImpl });
    const report = await analyze({ crawl, locale: "de" });
    expect(report.locale).toBe("de");
    expect(report.summary).toMatch(/Audit/);
  });
});
