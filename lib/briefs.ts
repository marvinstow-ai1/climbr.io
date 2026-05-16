// Content brief generator. Uses OpenAI when available, otherwise a
// deterministic German fallback so the workflow stays usable when keys
// are missing or the user is on the free tier without OpenAI configured.

export interface BriefInput {
  keyword: string;
  pageUrl?: string | null;
  /** Optional grounding signals from GSC / DataForSEO. */
  context?: {
    avgPosition?: number | null;
    impressions?: number | null;
    ctr?: number | null;
    relatedKeywords?: { keyword: string; searchVolume?: number | null }[];
  };
  locale?: "de" | "en";
  apiKey?: string | null;
}

export interface ContentBrief {
  keyword: string;
  intent: "informational" | "transactional" | "commercial" | "navigational";
  targetKeyword: string;
  secondaryKeywords: string[];
  pageStructure: { heading: string; type: "h2" | "h3"; bullets: string[] }[];
  titleSuggestions: string[];
  h1: string;
  faq: { q: string; a: string }[];
  internalLinks: string[];
  model: string;
  generatedAt: string;
}

const SYSTEM_PROMPT_DE = `Du bist eine erfahrene SEO-Texterin und Beraterin für kleine Unternehmen im DACH-Raum.
Erstelle aus einem Keyword einen kurzen, praxistauglichen Content-Brief. Antworte AUSSCHLIESSLICH mit gültigem JSON
im folgenden TypeScript-Schema:

{
  "intent": "informational" | "transactional" | "commercial" | "navigational",
  "targetKeyword": string,
  "secondaryKeywords": string[],   // 4-8 verwandte Begriffe
  "pageStructure": Array<{ "heading": string, "type": "h2" | "h3", "bullets": string[] }>,
  "titleSuggestions": string[],    // 3 Vorschläge, jeweils max 60 Zeichen
  "h1": string,                    // ein H1-Vorschlag
  "faq": Array<{ "q": string, "a": string }>,  // 3-5 typische Fragen mit kurzer Antwort
  "internalLinks": string[]        // 3-5 Anchor-Text-Vorschläge für interne Links
}

Sprache: Deutsch. Ton: klar, sachlich, hilfreich. Nutze die mitgelieferten GSC-/Keyword-Daten als Grundlage. Erfinde keine Statistiken.`;

export async function generateBrief(input: BriefInput): Promise<ContentBrief> {
  const useMock = (process.env.USE_MOCK_AI ?? "true").toLowerCase() !== "false";
  const apiKey = input.apiKey ?? process.env.OPENAI_API_KEY ?? null;
  if (useMock || !apiKey) return mockBrief(input);

  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const userPrompt = buildUserPrompt(input);

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT_DE },
          { role: "user", content: userPrompt },
        ],
      }),
      // Vercel edge fetch supports AbortSignal.timeout via the runtime.
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`openai ${r.status}`);
    const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("openai: empty response");
    const parsed = JSON.parse(content) as Omit<ContentBrief, "keyword" | "model" | "generatedAt">;
    return {
      ...parsed,
      keyword: input.keyword,
      model,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    // Graceful fallback — brief generation never breaks the workflow.
    return mockBrief(input);
  }
}

function buildUserPrompt(input: BriefInput): string {
  const ctx = input.context ?? {};
  const related = (ctx.relatedKeywords ?? [])
    .map((k) => `${k.keyword}${k.searchVolume ? ` (${k.searchVolume} SV)` : ""}`)
    .join(", ");
  return [
    `Keyword: ${input.keyword}`,
    input.pageUrl ? `Bestehende Seite: ${input.pageUrl}` : null,
    ctx.avgPosition != null ? `Aktuelle Position: ${ctx.avgPosition}` : null,
    ctx.impressions != null ? `Impressionen (28T): ${ctx.impressions}` : null,
    ctx.ctr != null ? `CTR: ${(ctx.ctr * 100).toFixed(1)}%` : null,
    related ? `Verwandte Keywords: ${related}` : null,
  ].filter(Boolean).join("\n");
}

function mockBrief(input: BriefInput): ContentBrief {
  const kw = input.keyword.trim();
  const cap = kw.charAt(0).toUpperCase() + kw.slice(1);
  const related = (input.context?.relatedKeywords ?? []).slice(0, 6).map((r) => r.keyword);
  const secondary = related.length > 0
    ? related
    : [`${kw} kaufen`, `${kw} test`, `${kw} vergleich`, `${kw} günstig`, `${kw} für anfänger`];
  return {
    keyword: kw,
    intent: kw.includes("kaufen") || kw.includes("preis") ? "transactional" : "informational",
    targetKeyword: kw,
    secondaryKeywords: secondary,
    pageStructure: [
      { heading: `Was ist ${kw}?`, type: "h2", bullets: ["Kurze Definition", "Für wen ist es relevant?"] },
      { heading: `${cap}: Worauf achten?`, type: "h2", bullets: ["Qualitätsmerkmale", "Häufige Fehler vermeiden"] },
      { heading: `${cap} richtig nutzen`, type: "h2", bullets: ["Schritt-für-Schritt-Anleitung", "Praxisbeispiel"] },
      { heading: "Häufige Fragen", type: "h2", bullets: ["Antworten auf die Top-Fragen aus der Zielgruppe"] },
    ],
    titleSuggestions: [
      `${cap} – Ratgeber für Einsteiger`,
      `${cap} kaufen: Worauf wirklich achten?`,
      `${cap} im Vergleich – Tipps & Empfehlungen`,
    ],
    h1: `${cap}: Der praktische Leitfaden`,
    faq: [
      { q: `Was kostet ${kw}?`, a: "Hängt von Qualität und Marke ab. Übliche Preisspannen kurz nennen." },
      { q: `Welches ${kw} ist für Anfänger geeignet?`, a: "Empfehlung mit klaren Auswahlkriterien geben." },
      { q: `Wie pflegt man ${kw}?`, a: "Kurze, praktische Pflegehinweise auflisten." },
    ],
    internalLinks: [
      `Mehr zum Thema ${kw}`,
      `${cap}-Vergleichstabelle`,
      "Ratgeber für Einsteiger",
    ],
    model: "mock",
    generatedAt: new Date().toISOString(),
  };
}
