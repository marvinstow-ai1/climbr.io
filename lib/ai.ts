import type { CrawlResult } from "./crawl.js";
import { deriveHeuristicScore } from "./crawl.js";

export interface AiFix {
  priority: "high" | "medium" | "low";
  title: string;
  why: string;
  steps: string[];
  example?: string;
  estimatedMinutes: number;
  impact: "high" | "medium" | "low";
}

export interface AiReport {
  score: number;
  locale: "en" | "de";
  summary: string;
  topFixes: AiFix[];
  quickWins: string[];
  furtherReading: { title: string; url: string }[];
  notes?: string[];
  model: string;
  generatedAt: string;
}

export interface GscRow {
  keyword: string;
  avgPosition: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

export interface AnalyzeInput {
  crawl: CrawlResult;
  gscRows?: GscRow[];
  locale?: "en" | "de";
}

const SYSTEM_PROMPT = `You are an expert SEO consultant for small e-commerce shops. Answer in the language of the user (detect via locale). For each input, produce a concise prioritized report with this structure:
1) Overall SEO score 0-100
2) Top 5 fixes with priority and expected impact
3) For each fix: short description, why it matters, exact step-by-step fix in plain language, and a suggested example (e.g., suggested new title tag)
4) Quick Wins (<= 10 min) list
5) Estimated difficulty/time (minutes) per fix
6) Further reading links (optional)
Use German simple language for de locale and English for en. Do not hallucinate facts (use only crawl + GSC data provided). If GSC rankings are missing, say so explicitly and provide best-guess ranking impact.

Return ONLY valid JSON matching this TypeScript shape:
{
  "score": number,
  "locale": "en" | "de",
  "summary": string,
  "topFixes": Array<{
    "priority": "high" | "medium" | "low",
    "title": string,
    "why": string,
    "steps": string[],
    "example"?: string,
    "estimatedMinutes": number,
    "impact": "high" | "medium" | "low"
  }>,
  "quickWins": string[],
  "furtherReading": Array<{ "title": string, "url": string }>,
  "notes"?: string[]
}`;

export async function analyze(input: AnalyzeInput): Promise<AiReport> {
  const locale = input.locale ?? "en";
  const useMock = (process.env.USE_MOCK_AI ?? "true").toLowerCase() !== "false";

  if (useMock || !process.env.OPENAI_API_KEY) {
    return mockReport(input.crawl, locale);
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const userPrompt = buildUserPrompt(input);

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`openai ${resp.status}: ${text.slice(0, 500)}`);
  }

  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("openai: empty response");

  const parsed = JSON.parse(content) as Omit<AiReport, "model" | "generatedAt">;
  return {
    ...parsed,
    locale,
    model,
    generatedAt: new Date().toISOString(),
  };
}

function buildUserPrompt(input: AnalyzeInput): string {
  const { crawl, gscRows, locale } = input;
  const trimmed = {
    url: crawl.finalUrl,
    status: crawl.status,
    responseTimeMs: crawl.responseTimeMs,
    lang: crawl.lang,
    title: crawl.title,
    titleLength: crawl.title?.length ?? 0,
    metaDescription: crawl.metaDescription,
    metaDescriptionLength: crawl.metaDescription?.length ?? 0,
    metaRobots: crawl.metaRobots,
    canonical: crawl.canonical,
    headings: crawl.headings,
    imageCount: crawl.imageCount,
    imagesMissingAlt: crawl.imagesMissingAlt,
    sampleImages: crawl.images.slice(0, 5),
    internalLinkCount: crawl.internalLinks.length,
    externalLinkCount: crawl.externalLinks.length,
    structuredDataTypes: crawl.structuredData
      .map((d) => (typeof d === "object" && d && "@type" in (d as object) ? (d as { "@type": unknown })["@type"] : null))
      .filter(Boolean),
    hasRobotsTxt: !!crawl.robotsTxt,
    sitemapUrl: crawl.sitemapUrl,
    bodyPreview: crawl.bodyTextTruncated,
    bodyTruncated: crawl.bodyTruncated,
  };

  return [
    `Locale: ${locale ?? "en"}`,
    "",
    "Crawl JSON:",
    JSON.stringify(trimmed, null, 2),
    "",
    "GSC rows:",
    gscRows && gscRows.length > 0 ? JSON.stringify(gscRows, null, 2) : "(none — GSC not connected)",
    "",
    "Produce the report according to the system prompt. Return JSON only.",
  ].join("\n");
}

// ---------- Mock report (used when USE_MOCK_AI=true) ----------

function mockReport(c: CrawlResult, locale: "en" | "de"): AiReport {
  const fixes: AiFix[] = [];

  if (!c.title || c.title.length < 10) {
    fixes.push({
      priority: "high",
      impact: "high",
      title: locale === "de" ? "Title-Tag fehlt oder ist zu kurz" : "Missing or short title tag",
      why: locale === "de"
        ? "Der Title ist eines der stärksten Ranking-Signale und entscheidet über die Klickrate in der Suche."
        : "The title tag is one of the strongest ranking signals and drives click-through rate from search.",
      steps: [
        locale === "de" ? "Öffne deine Seitenvorlage." : "Open your page template.",
        locale === "de" ? "Setze einen <title>-Tag mit 50-60 Zeichen, der das Hauptkeyword enthält." : "Add a <title> tag with 50-60 characters containing your primary keyword.",
        locale === "de" ? "Stelle sicher, dass jede Seite einen eindeutigen Title hat." : "Ensure every page has a unique title.",
      ],
      example: locale === "de"
        ? "Beispiel: \"Handgemachte Lederrucksäcke aus München | climbr\""
        : 'Example: "Handcrafted Leather Backpacks — Free EU Shipping | climbr"',
      estimatedMinutes: 5,
    });
  }

  if (!c.metaDescription || c.metaDescription.length < 50) {
    fixes.push({
      priority: "high",
      impact: "medium",
      title: locale === "de" ? "Meta-Description fehlt oder ist zu kurz" : "Missing or short meta description",
      why: locale === "de"
        ? "Eine gute Meta-Description erhöht die Klickrate, auch wenn sie kein direktes Ranking-Signal ist."
        : "A strong meta description improves CTR even though it's not a direct ranking signal.",
      steps: [
        locale === "de" ? "Schreibe eine Beschreibung mit 140-160 Zeichen." : "Write a 140-160 character description.",
        locale === "de" ? "Erwähne den Hauptnutzen und einen CTA." : "Mention the core benefit and a CTA.",
      ],
      example: locale === "de"
        ? "Beispiel: \"Entdecke handgemachte Lederrucksäcke — kostenloser Versand in der EU. Jetzt ansehen.\""
        : 'Example: "Discover handcrafted leather backpacks made in the EU. Free shipping over €60 — shop the collection."',
      estimatedMinutes: 10,
    });
  }

  if (c.headings.h1.length === 0) {
    fixes.push({
      priority: "high",
      impact: "medium",
      title: locale === "de" ? "Kein H1 auf der Seite" : "No H1 on page",
      why: locale === "de"
        ? "H1 hilft Suchmaschinen und Nutzern, das Thema der Seite sofort zu erkennen."
        : "An H1 helps search engines and users understand the page topic at a glance.",
      steps: [
        locale === "de" ? "Füge genau einen <h1> über dem Hauptinhalt ein." : "Add exactly one <h1> above the main content.",
        locale === "de" ? "Nutze das Hauptkeyword natürlich im H1." : "Use the primary keyword naturally in the H1.",
      ],
      estimatedMinutes: 5,
    });
  } else if (c.headings.h1.length > 1) {
    fixes.push({
      priority: "medium",
      impact: "low",
      title: locale === "de" ? "Mehrere H1-Tags" : "Multiple H1 tags",
      why: locale === "de"
        ? "Ein einziges H1 pro Seite ist die klare Empfehlung."
        : "Best practice is one H1 per page.",
      steps: [locale === "de" ? "Reduziere auf genau ein H1; nutze H2/H3 für Unterabschnitte." : "Keep one H1; convert others to H2/H3."],
      estimatedMinutes: 10,
    });
  }

  if (c.imagesMissingAlt > 0) {
    fixes.push({
      priority: c.imagesMissingAlt > 5 ? "high" : "medium",
      impact: "medium",
      title: locale === "de"
        ? `${c.imagesMissingAlt} Bilder ohne Alt-Text`
        : `${c.imagesMissingAlt} images missing alt text`,
      why: locale === "de"
        ? "Alt-Texte verbessern Barrierefreiheit und sind ein Ranking-Signal für die Bildersuche."
        : "Alt text improves accessibility and is a ranking signal for image search.",
      steps: [
        locale === "de" ? "Ergänze beschreibende Alt-Texte (5-12 Wörter)." : "Add descriptive alt text (5-12 words).",
        locale === "de" ? "Vermeide \"image1.jpg\" — beschreibe den Inhalt." : "Avoid \"image1.jpg\" — describe the content.",
      ],
      example: locale === "de"
        ? `Beispiel für ${c.images[0]?.src ?? "ein Produktbild"}: "Brauner Lederrucksack mit Messingverschluss"`
        : `For ${c.images[0]?.src ?? "your product image"}: "Brown leather backpack with brass buckle"`,
      estimatedMinutes: Math.min(60, c.imagesMissingAlt * 2),
    });
  }

  if (!c.canonical) {
    fixes.push({
      priority: "medium",
      impact: "medium",
      title: locale === "de" ? "Canonical-Tag fehlt" : "Missing canonical tag",
      why: locale === "de"
        ? "Verhindert Duplicate-Content-Probleme, besonders bei Filtern/Parametern."
        : "Prevents duplicate-content issues, especially with filter and parameter URLs.",
      steps: [
        locale === "de" ? "Füge <link rel=\"canonical\" href=\"<aktuelle-url>\"> in den <head> ein." : "Add <link rel=\"canonical\" href=\"<page-url>\"> to <head>.",
      ],
      estimatedMinutes: 5,
    });
  }

  if (c.structuredData.length === 0) {
    fixes.push({
      priority: "low",
      impact: "medium",
      title: locale === "de" ? "Kein strukturiertes Daten-Markup" : "No structured data",
      why: locale === "de"
        ? "Schema.org-Markup kann Rich Results in der Suche auslösen (Sterne, Preis, Verfügbarkeit)."
        : "Schema.org markup can unlock rich results in search (stars, price, availability).",
      steps: [
        locale === "de" ? "Füge Product- oder Organization-Markup als JSON-LD im <head> ein." : "Add Product or Organization JSON-LD to <head>.",
      ],
      estimatedMinutes: 20,
    });
  }

  const topFixes = fixes.slice(0, 5);

  const quickWins = [
    !c.canonical && (locale === "de" ? "Canonical-Tag ergänzen" : "Add canonical tag"),
    !c.metaDescription && (locale === "de" ? "Meta-Description schreiben" : "Write a meta description"),
    c.imagesMissingAlt > 0 && (locale === "de"
      ? `Alt-Texte für ${Math.min(3, c.imagesMissingAlt)} Bilder ergänzen`
      : `Add alt text for ${Math.min(3, c.imagesMissingAlt)} images`),
  ].filter(Boolean) as string[];

  return {
    score: deriveHeuristicScore(c),
    locale,
    summary: locale === "de"
      ? `Dein Audit für ${c.finalUrl} ist fertig. Hinweis: Mock-Modus aktiv — kein echter GPT-Aufruf.`
      : `Audit for ${c.finalUrl} complete. Note: mock mode active — no live GPT call was made.`,
    topFixes,
    quickWins,
    furtherReading: [
      { title: "Google SEO Starter Guide", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide" },
    ],
    notes: ["mock-report"],
    model: "mock",
    generatedAt: new Date().toISOString(),
  };
}
