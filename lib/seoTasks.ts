// Turn raw opportunities into concrete, plain-language tasks for small
// business owners. We don't call OpenAI here — the language is templated
// and deterministic so users see consistent task wording.

import type { OpportunityType } from "./opportunities.js";

export interface GeneratedTask {
  title: string;
  why: string;
  expected_impact: string;
  effort: "low" | "medium" | "high";
  suggested_action: string;
  lane: "optimize" | "publish" | "review" | "discover";
}

export interface OpportunitySource {
  type: OpportunityType;
  page_url: string | null;
  query: string | null;
  impressions: number | null;
  clicks: number | null;
  position: number | null;
  ctr: number | null;
  data: Record<string, unknown> | null;
}

export function taskFromOpportunity(op: OpportunitySource): GeneratedTask {
  const page = op.page_url ?? "(unbekannte Seite)";
  const query = op.query ?? "(unbekannte Suchanfrage)";
  const pos = op.position != null ? Math.round(op.position) : null;
  const imp = op.impressions ?? 0;
  const clicks = op.clicks ?? 0;

  switch (op.type) {
    case "high_impressions_low_ctr":
      return {
        title: `Snippet für „${query}“ überarbeiten`,
        why: `Diese Suchanfrage wurde in den letzten 28 Tagen ${imp.toLocaleString("de-DE")}-mal gesehen, aber nur ${clicks}-mal geklickt. Das Snippet überzeugt offensichtlich nicht.`,
        expected_impact: "Mehr Klicks bei gleicher Sichtbarkeit – realistisch +20-50% CTR.",
        effort: "low",
        suggested_action: `Öffne ${page}. Schreibe den Title (max. 60 Zeichen) und die Meta-Description (max. 155 Zeichen) so um, dass das Keyword „${query}“ klar im Title vorkommt und die Description einen konkreten Nutzen verspricht.`,
        lane: "optimize",
      };
    case "striking_distance":
      return {
        title: `„${query}“ auf Seite 1 bringen (aktuell Position ${pos ?? "?"})`,
        why: `Du rankst bereits auf Position ${pos ?? "?"} – der Sprung auf Seite 1 verdoppelt typischerweise den Traffic für diese Anfrage.`,
        expected_impact: "Deutlich mehr organische Klicks, sobald du in die Top 10 rutschst.",
        effort: "medium",
        suggested_action: `Stärke ${page}: H1 enthält das Keyword, ergänze 1-2 Abschnitte mit verwandten Begriffen, setze 2-3 interne Links von themenverwandten Seiten und prüfe Ladezeit.`,
        lane: "optimize",
      };
    case "declining_clicks": {
      const drop = (op.data?.dropPct as number | undefined) ?? null;
      return {
        title: `Rückgang bei „${query}“ prüfen`,
        why: `Die Klicks auf diese Anfrage sind im Vergleich zur Vorperiode um ${drop ?? "über 30"}% gefallen. Das ist oft ein Hinweis auf Position-Verlust oder neue Wettbewerbsseiten.`,
        expected_impact: "Verlorenen Traffic wiederherstellen.",
        effort: "medium",
        suggested_action: `Öffne ${page}, suche in Google nach „${query}“ und vergleiche dein Snippet mit den Top-3-Ergebnissen. Inhalte aktualisieren, fehlende Themen ergänzen.`,
        lane: "review",
      };
    }
    case "stagnant_impressions":
      return {
        title: `„${query}“: Impressionen ohne Klicks aktivieren`,
        why: `${imp.toLocaleString("de-DE")} Impressionen, aber 0 Klicks – die Seite ist sichtbar, aber das Snippet überzeugt nicht oder die Intent passt nicht.`,
        expected_impact: "Erste Klicks generieren, Sichtbarkeit in Traffic umwandeln.",
        effort: "low",
        suggested_action: `Prüfe ${page}: Passt der Inhalt zur Suchabsicht? Falls ja, Title/Description schärfen. Falls nein, eigenständige Landingpage für „${query}“ erstellen.`,
        lane: "optimize",
      };
    case "missing_meta":
      return {
        title: `Title & Meta für ${page} ergänzen`,
        why: "Die Seite hat keinen aussagekräftigen Title oder keine Description – Google fällt dann auf zufälligen Seitentext zurück.",
        expected_impact: "Bessere Klickrate aus der Suche, klarere Positionierung in den Ergebnissen.",
        effort: "low",
        suggested_action: `Setze auf ${page} einen Title (max. 60 Zeichen) und eine Meta-Description (max. 155 Zeichen) mit klarem Nutzenversprechen.`,
        lane: "optimize",
      };
  }
}
