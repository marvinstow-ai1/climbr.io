/**
 * Unit tests for the wiki data + search/filter helpers.
 *
 * The article content itself isn't tested for prose quality — but we
 * guard the structural invariants (unique slugs, valid related-slugs,
 * non-empty fields) that would break the UI silently otherwise.
 */

import { describe, expect, it } from "vitest";
import {
  WIKI_ARTICLES,
  WIKI_CATEGORIES,
  filterByCategory,
  getArticle,
  searchArticles,
} from "../frontend/src/data/wiki/index.js";

describe("wiki data invariants", () => {
  it("has at least 21 articles (Phase-4 acceptance criterion)", () => {
    expect(WIKI_ARTICLES.length).toBeGreaterThanOrEqual(21);
  });

  it("slugs are unique", () => {
    const slugs = WIKI_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every article has the required fields", () => {
    for (const a of WIKI_ARTICLES) {
      expect(a.slug, `slug for ${a.title}`).toMatch(/^[a-z0-9-]+$/);
      expect(a.title.length).toBeGreaterThan(3);
      expect(a.summary.length).toBeGreaterThan(10);
      expect(a.body.length).toBeGreaterThan(100);
      expect(a.readingTime).toBeGreaterThan(0);
      expect(WIKI_CATEGORIES).toContain(a.category);
    }
  });

  it("every relatedSlug resolves to an existing article", () => {
    const known = new Set(WIKI_ARTICLES.map((a) => a.slug));
    for (const a of WIKI_ARTICLES) {
      for (const r of a.relatedSlugs) {
        expect(known.has(r), `${a.slug} → related ${r}`).toBe(true);
      }
    }
  });

  it("covers all five categories", () => {
    const covered = new Set(WIKI_ARTICLES.map((a) => a.category));
    for (const cat of WIKI_CATEGORIES) {
      expect(covered.has(cat), `category ${cat}`).toBe(true);
    }
  });
});

describe("getArticle", () => {
  it("returns the article when the slug matches", () => {
    const a = getArticle("title-tag");
    expect(a?.title).toMatch(/Title Tag/);
  });

  it("returns null for unknown slugs", () => {
    expect(getArticle("does-not-exist")).toBeNull();
  });
});

describe("searchArticles", () => {
  it("returns everything for an empty query", () => {
    expect(searchArticles("")).toHaveLength(WIKI_ARTICLES.length);
    expect(searchArticles("   ")).toHaveLength(WIKI_ARTICLES.length);
  });

  it("matches a single word case-insensitively", () => {
    const r = searchArticles("Sitemap");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((a) => a.slug === "sitemap")).toBe(true);
  });

  it("AND-matches multiple tokens", () => {
    const r = searchArticles("title tag");
    expect(r.some((a) => a.slug === "title-tag")).toBe(true);
    // A keyword article that doesn't mention "title" should not match.
    expect(r.every((a) => /title/i.test(a.title) || /title/i.test(a.body))).toBe(true);
  });

  it("returns empty for nonsense queries", () => {
    expect(searchArticles("xyzzy-not-a-real-term")).toHaveLength(0);
  });

  it("searches the body, not just the title", () => {
    // "Vollnarbleder" appears only inside an article body in our seed data.
    const r = searchArticles("Vollnarbleder");
    expect(r.length).toBeGreaterThan(0);
  });
});

describe("filterByCategory", () => {
  it("returns all when filter is 'Alle'", () => {
    expect(filterByCategory(WIKI_ARTICLES, "Alle")).toHaveLength(WIKI_ARTICLES.length);
  });

  it("returns only the matching category", () => {
    const onPage = filterByCategory(WIKI_ARTICLES, "On-Page SEO");
    expect(onPage.length).toBeGreaterThan(0);
    expect(onPage.every((a) => a.category === "On-Page SEO")).toBe(true);
  });

  it("combines with searchArticles to AND-filter", () => {
    const searched = searchArticles("keyword");
    const technical = filterByCategory(searched, "Technisches SEO");
    expect(technical.every((a) => a.category === "Technisches SEO")).toBe(true);
  });
});
