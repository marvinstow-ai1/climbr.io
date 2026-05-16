import { WIKI_ARTICLES } from "./articles";
import type { WikiArticle, WikiCategory } from "./types";

export { WIKI_ARTICLES };
export type { WikiArticle, WikiCategory };

export const WIKI_CATEGORIES: WikiCategory[] = [
  "Grundlagen",
  "On-Page SEO",
  "Technisches SEO",
  "Keywords",
  "Lokales SEO",
];

const BY_SLUG = new Map(WIKI_ARTICLES.map((a) => [a.slug, a]));

export function getArticle(slug: string): WikiArticle | null {
  return BY_SLUG.get(slug) ?? null;
}

/**
 * Client-side Suche über Titel + Summary + Body. Case-insensitive,
 * Token-basiert: alle Suchbegriffe müssen vorkommen (UND-Verknüpfung).
 */
export function searchArticles(query: string, articles: WikiArticle[] = WIKI_ARTICLES): WikiArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return articles;
  const tokens = q.split(/\s+/).filter(Boolean);
  return articles.filter((a) => {
    const haystack = `${a.title} ${a.summary} ${a.body} ${a.category}`.toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
}

export function filterByCategory(
  articles: WikiArticle[],
  category: WikiCategory | "Alle",
): WikiArticle[] {
  if (category === "Alle") return articles;
  return articles.filter((a) => a.category === category);
}
