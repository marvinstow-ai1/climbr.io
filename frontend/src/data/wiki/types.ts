export type WikiCategory =
  | "Grundlagen"
  | "On-Page SEO"
  | "Technisches SEO"
  | "Keywords"
  | "Lokales SEO";

export interface WikiArticle {
  slug: string;
  title: string;
  category: WikiCategory;
  /** Lesezeit in Minuten. */
  readingTime: number;
  summary: string;
  /** Markdown-ähnlich; einfache Absätze und Listen. Rendert über WikiBody. */
  body: string;
  relatedSlugs: string[];
}
