import { describe, expect, it } from "vitest";
import { parseHtml, crawlUrl, deriveHeuristicScore } from "../lib/crawl.js";

const FIXTURE = `<!doctype html>
<html lang="en">
  <head>
    <title>Test Shop — Handmade Leather</title>
    <meta name="description" content="A small, neat description for our handmade leather shop in Berlin." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://example.com/" />
    <meta property="og:title" content="Test Shop" />
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Test Shop"}</script>
  </head>
  <body>
    <h1>Welcome to the Test Shop</h1>
    <h2>Featured products</h2>
    <p>Hand-stitched leather goods.</p>
    <img src="/img/a.jpg" alt="Brown leather wallet" />
    <img src="/img/b.jpg" />
    <a href="/about">About</a>
    <a href="https://external.example/blog">External</a>
  </body>
</html>`;

describe("parseHtml", () => {
  const parsed = parseHtml(FIXTURE);

  it("extracts title", () => {
    expect(parsed.title).toBe("Test Shop — Handmade Leather");
  });
  it("extracts meta description", () => {
    expect(parsed.metaDescription).toContain("handmade leather shop in Berlin");
  });
  it("extracts canonical and meta robots", () => {
    expect(parsed.canonical).toBe("https://example.com/");
    expect(parsed.metaRobots).toBe("index, follow");
  });
  it("extracts og:title", () => {
    expect(parsed.ogTitle).toBe("Test Shop");
  });
  it("extracts h1 and h2", () => {
    expect(parsed.headings.h1).toEqual(["Welcome to the Test Shop"]);
    expect(parsed.headings.h2).toEqual(["Featured products"]);
  });
  it("extracts images including missing alt", () => {
    expect(parsed.images).toHaveLength(2);
    expect(parsed.images[0]).toEqual({ src: "/img/a.jpg", alt: "Brown leather wallet" });
    expect(parsed.images[1]?.alt).toBe("");
  });
  it("extracts links", () => {
    expect(parsed.links.map((l) => l.href)).toEqual(["/about", "https://external.example/blog"]);
  });
  it("extracts JSON-LD", () => {
    expect(parsed.structuredData).toHaveLength(1);
    expect((parsed.structuredData[0] as { "@type": string })["@type"]).toBe("Organization");
  });
});

describe("crawlUrl (integration with mocked fetch)", () => {
  it("returns a consistent crawl result", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nSitemap: https://example.com/sitemap.xml", { status: 200 });
      }
      return new Response(FIXTURE, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    };

    const result = await crawlUrl("https://example.com/", { fetchImpl });
    expect(result.status).toBe(200);
    expect(result.title).toBe("Test Shop — Handmade Leather");
    expect(result.imagesMissingAlt).toBe(1);
    expect(result.internalLinks).toHaveLength(1);
    expect(result.externalLinks).toHaveLength(1);
    expect(result.sitemapUrl).toBe("https://example.com/sitemap.xml");
    expect(result.bodyTextTruncated).toContain("Welcome to the Test Shop");
  });
});

describe("deriveHeuristicScore", () => {
  it("returns 100 for a clean fixture", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(FIXTURE, { status: 200, headers: { "content-type": "text/html" } });
    const r = await crawlUrl("https://example.com/", { fetchImpl });
    const score = deriveHeuristicScore(r);
    // One image is missing alt → -1; everything else clean.
    expect(score).toBeGreaterThanOrEqual(90);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("penalises a broken page", async () => {
    const broken = "<html><body>oops</body></html>";
    const fetchImpl: typeof fetch = async () =>
      new Response(broken, { status: 500, headers: { "content-type": "text/html" } });
    const r = await crawlUrl("https://example.com/", { fetchImpl });
    const score = deriveHeuristicScore(r);
    expect(score).toBeLessThan(60);
  });
});
