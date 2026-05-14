// Edge-compatible HTML parser for SEO signals.
// Regex-based on purpose — `cheerio` doesn't run in edge runtime.
// Swap to `linkedom` when/if we move to Node runtime.

export interface CrawlImage {
  src: string;
  alt: string;
}

export interface CrawlLink {
  href: string;
  text: string;
  rel?: string;
}

export interface CrawlResult {
  url: string;
  finalUrl: string;
  status: number;
  responseTimeMs: number;
  contentLength: number;
  contentType: string | null;
  lang: string | null;
  title: string | null;
  metaDescription: string | null;
  metaRobots: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  images: CrawlImage[];
  internalLinks: CrawlLink[];
  externalLinks: CrawlLink[];
  imageCount: number;
  imagesMissingAlt: number;
  structuredData: unknown[];
  robotsTxt: string | null;
  sitemapUrl: string | null;
  bodyTextTruncated: string;
  bodyTruncated: boolean;
}

const USER_AGENT = "climbr.io-bot/0.1 (+https://climbr.io/bot)";
const MAX_BODY_BYTES = 1_500_000; // 1.5 MB
const TRUNCATED_BODY_CHARS = 4000;

export interface FetchOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export async function crawlUrl(rawUrl: string, opts: FetchOptions = {}): Promise<CrawlResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 10_000;

  const url = normalizeUrl(rawUrl);
  const start = Date.now();

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }

  const finalUrl = res.url || url;
  const contentType = res.headers.get("content-type");
  const html = await readBoundedText(res, MAX_BODY_BYTES);
  const responseTimeMs = Date.now() - start;

  const parsed = parseHtml(html);

  const origin = new URL(finalUrl).origin;
  const { internalLinks, externalLinks } = splitLinks(parsed.links, origin);

  const robotsTxt = await tryFetch(`${origin}/robots.txt`, fetchImpl, 3000);
  const sitemapUrl = extractSitemapFromRobots(robotsTxt) ?? `${origin}/sitemap.xml`;

  return {
    url: rawUrl,
    finalUrl,
    status: res.status,
    responseTimeMs,
    contentLength: html.length,
    contentType,
    lang: parsed.lang,
    title: parsed.title,
    metaDescription: parsed.metaDescription,
    metaRobots: parsed.metaRobots,
    canonical: parsed.canonical,
    ogTitle: parsed.ogTitle,
    ogDescription: parsed.ogDescription,
    ogImage: parsed.ogImage,
    headings: parsed.headings,
    images: parsed.images.slice(0, 50),
    internalLinks: internalLinks.slice(0, 100),
    externalLinks: externalLinks.slice(0, 100),
    imageCount: parsed.images.length,
    imagesMissingAlt: parsed.images.filter((i) => !i.alt.trim()).length,
    structuredData: parsed.structuredData,
    robotsTxt: robotsTxt ? robotsTxt.slice(0, 2000) : null,
    sitemapUrl,
    bodyTextTruncated: parsed.bodyText.slice(0, TRUNCATED_BODY_CHARS),
    bodyTruncated: parsed.bodyText.length > TRUNCATED_BODY_CHARS,
  };
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function readBoundedText(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return await res.text();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let received = 0;
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (received >= maxBytes) {
      try { await reader.cancel(); } catch { /* ignore */ }
      break;
    }
  }
  out += decoder.decode();
  return out;
}

async function tryFetch(url: string, fetchImpl: typeof fetch, timeoutMs: number): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(url, { headers: { "user-agent": USER_AGENT }, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractSitemapFromRobots(robots: string | null): string | null {
  if (!robots) return null;
  const m = robots.match(/^\s*sitemap:\s*(\S+)/im);
  return m && m[1] ? m[1].trim() : null;
}

// -------- HTML parser (regex-based, edge-safe) --------

interface ParsedHtml {
  lang: string | null;
  title: string | null;
  metaDescription: string | null;
  metaRobots: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  images: CrawlImage[];
  links: { href: string; text: string; rel?: string }[];
  structuredData: unknown[];
  bodyText: string;
}

export function parseHtml(html: string): ParsedHtml {
  const headHtml = matchOne(html, /<head[^>]*>([\s\S]*?)<\/head>/i) ?? html;
  const bodyHtml = matchOne(html, /<body[^>]*>([\s\S]*?)<\/body>/i) ?? html;

  return {
    lang: attr(matchOne(html, /<html\b([^>]*)>/i) ?? "", "lang"),
    title: decodeEntities(matchOne(headHtml, /<title[^>]*>([\s\S]*?)<\/title>/i)?.trim() ?? null),
    metaDescription: metaContent(headHtml, "description"),
    metaRobots: metaContent(headHtml, "robots"),
    canonical: linkHref(headHtml, "canonical"),
    ogTitle: metaProperty(headHtml, "og:title"),
    ogDescription: metaProperty(headHtml, "og:description"),
    ogImage: metaProperty(headHtml, "og:image"),
    headings: {
      h1: collectHeadings(bodyHtml, 1),
      h2: collectHeadings(bodyHtml, 2),
      h3: collectHeadings(bodyHtml, 3),
    },
    images: collectImages(bodyHtml),
    links: collectLinks(bodyHtml),
    structuredData: collectJsonLd(html),
    bodyText: stripTags(bodyHtml),
  };
}

function matchOne(s: string, re: RegExp): string | null {
  const m = s.match(re);
  return m && m[1] !== undefined ? m[1] : null;
}

function attr(tagInner: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = tagInner.match(re);
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? null);
}

function metaContent(head: string, name: string): string | null {
  const re = new RegExp(
    `<meta\\b[^>]*\\bname\\s*=\\s*["']${escapeRe(name)}["'][^>]*>`,
    "i",
  );
  const tag = head.match(re)?.[0];
  return tag ? attr(tag, "content") : null;
}

function metaProperty(head: string, property: string): string | null {
  const re = new RegExp(
    `<meta\\b[^>]*\\bproperty\\s*=\\s*["']${escapeRe(property)}["'][^>]*>`,
    "i",
  );
  const tag = head.match(re)?.[0];
  return tag ? attr(tag, "content") : null;
}

function linkHref(head: string, rel: string): string | null {
  const re = new RegExp(
    `<link\\b[^>]*\\brel\\s*=\\s*["']${escapeRe(rel)}["'][^>]*>`,
    "i",
  );
  const tag = head.match(re)?.[0];
  return tag ? attr(tag, "href") : null;
}

function collectHeadings(body: string, level: number): string[] {
  const re = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi");
  const out: string[] = [];
  for (const m of body.matchAll(re)) {
    const text = stripTags(m[1] ?? "").trim();
    if (text) out.push(text);
  }
  return out.slice(0, 50);
}

function collectImages(body: string): CrawlImage[] {
  const out: CrawlImage[] = [];
  for (const m of body.matchAll(/<img\b([^>]*)>/gi)) {
    const inner = m[1] ?? "";
    const src = attr(inner, "src");
    if (!src) continue;
    out.push({ src, alt: attr(inner, "alt") ?? "" });
  }
  return out;
}

function collectLinks(body: string): { href: string; text: string; rel?: string }[] {
  const out: { href: string; text: string; rel?: string }[] = [];
  for (const m of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const inner = m[1] ?? "";
    const href = attr(inner, "href");
    if (!href) continue;
    const rel = attr(inner, "rel") ?? undefined;
    const text = stripTags(m[2] ?? "").trim().slice(0, 200);
    out.push({ href, text, rel });
  }
  return out;
}

function collectJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  for (const m of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = (m[1] ?? "").trim();
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      // ignore invalid JSON-LD
    }
  }
  return out;
}

function splitLinks(
  links: { href: string; text: string; rel?: string }[],
  origin: string,
): { internalLinks: CrawlLink[]; externalLinks: CrawlLink[] } {
  const internal: CrawlLink[] = [];
  const external: CrawlLink[] = [];
  for (const l of links) {
    let abs: URL;
    try {
      abs = new URL(l.href, origin);
    } catch {
      continue;
    }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
    const entry: CrawlLink = { href: abs.toString(), text: l.text };
    if (l.rel) entry.rel = l.rel;
    if (abs.origin === origin) internal.push(entry);
    else external.push(entry);
  }
  return { internalLinks: internal, externalLinks: external };
}

function stripTags(s: string): string {
  return s
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeEntities(s: string | null): string | null {
  if (s == null) return null;
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x?([0-9a-f]+);/gi, (_m, code: string) => {
      const n = code.toLowerCase().startsWith("x") || /[a-f]/i.test(code)
        ? parseInt(code, 16)
        : parseInt(code, 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _m;
    });
}

// -------- score derivation (used when AI fails / mock mode) --------

export function deriveHeuristicScore(c: CrawlResult): number {
  let score = 100;
  if (!c.title || c.title.length < 10) score -= 10;
  if (c.title && c.title.length > 65) score -= 5;
  if (!c.metaDescription || c.metaDescription.length < 50) score -= 10;
  if (c.metaDescription && c.metaDescription.length > 165) score -= 5;
  if (c.headings.h1.length === 0) score -= 10;
  if (c.headings.h1.length > 1) score -= 5;
  if (!c.canonical) score -= 5;
  if (c.imagesMissingAlt > 0) score -= Math.min(15, c.imagesMissingAlt);
  if (c.structuredData.length === 0) score -= 5;
  if (c.status >= 400) score -= 30;
  if (c.responseTimeMs > 3000) score -= 5;
  return Math.max(0, Math.min(100, score));
}
