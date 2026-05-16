/**
 * Microcopy für den Learning-Layer (Bereich 2 der Phase 4).
 *
 * Jeder Eintrag hat die drei Bausteine:
 *   - what:        Kurze Definition.
 *   - whyItMatters: Warum es für die Suchmaschine zählt.
 *   - nextStep:    Konkreter erster Schritt.
 *
 * Verwendung später in `<ExplainerBox>` und `<NextStepCTA>`.
 */

export interface LearningEntry {
  /** Stabile Kennung — auch als data-testid und Wiki-Slug nutzbar. */
  key: string;
  title: string;
  what: string;
  whyItMatters: string;
  nextStep: string;
}

export const LEARNING_ENTRIES: Record<string, LearningEntry> = {
  "seo-score": {
    key: "seo-score",
    title: "Was ist der SEO-Score?",
    what: "Der SEO-Score zeigt auf einer Skala von 0–100, wie gut deine Website technisch und inhaltlich für Suchmaschinen aufgestellt ist. Ein Score von 70+ ist gut — unter 40 gibt es dringenden Handlungsbedarf.",
    whyItMatters: "Suchmaschinen wie Google bevorzugen technisch saubere Seiten. Ein höherer Score verbessert deine Chancen, weiter oben in den Suchergebnissen zu erscheinen.",
    nextStep: "Arbeite die Top-5-Fixes der Reihe nach ab. Fang oben an — diese Punkte haben den größten Einfluss auf dein Ranking.",
  },
  "meta-description": {
    key: "meta-description",
    title: "Meta-Description",
    what: "Die Meta-Description ist der kurze Text, der in den Google-Suchergebnissen unter deinem Seitentitel erscheint. Sie beeinflusst, ob jemand auf dein Ergebnis klickt.",
    whyItMatters: "Eine gute Meta-Description erhöht die Klickrate — mehr Besucher ohne mehr Werbeausgaben.",
    nextStep: "Füge in deinem CMS oder Website-Editor eine Meta-Description von 120–160 Zeichen hinzu. Sie sollte dein wichtigstes Keyword enthalten und neugierig machen.",
  },
  "title-tag": {
    key: "title-tag",
    title: "Title Tag",
    what: "Der Title Tag ist die Überschrift deiner Seite in den Suchergebnissen — das Erste, was potenzielle Kunden sehen.",
    whyItMatters: "Google nutzt den Title Tag, um den Inhalt deiner Seite zu verstehen. Ein präziser Titel mit deinem Hauptkeyword verbessert dein Ranking direkt.",
    nextStep: "Passe den Titel in deinem CMS an: 50–60 Zeichen, enthält dein wichtigstes Keyword, beschreibt klar was die Seite bietet.",
  },
  "h1-tag": {
    key: "h1-tag",
    title: "H1-Tag",
    what: "Der H1-Tag ist die Hauptüberschrift deiner Seite — sichtbar für Besucher und wichtig für Suchmaschinen.",
    whyItMatters: "Google nutzt die H1 als starkes Signal dafür, worum es auf der Seite geht. Jede Seite sollte genau eine H1 haben.",
    nextStep: "Prüfe in deinem Editor ob deine Hauptüberschrift als H1 formatiert ist (nicht nur fett oder groß). Sie sollte dein wichtigstes Keyword enthalten.",
  },
  "alt-text": {
    key: "alt-text",
    title: "Alt-Texte",
    what: "Alt-Texte beschreiben Bilder für Suchmaschinen (und sehbehinderte Nutzer). Google kann Bilder nicht 'sehen' — der Alt-Text erklärt, was drauf ist.",
    whyItMatters: "Fehlende Alt-Texte sind eine verpasste Chance: Google-Bildersuche, Barrierefreiheit und Rankings leiden darunter.",
    nextStep: "Füge bei jedem Produktbild einen Alt-Text hinzu, der das Bild beschreibt und ggf. dein Keyword enthält. Beispiel: 'Rote Laufschuhe Herren Größe 42'.",
  },
  "canonical": {
    key: "canonical",
    title: "Canonical Tag",
    what: "Ein Canonical Tag sagt Google, welche Version deiner Seite die 'echte' ist — wichtig wenn dieselben Inhalte unter mehreren URLs erreichbar sind.",
    whyItMatters: "Ohne Canonical kann Google deine eigenen Seiten als Duplikat werten und dein Ranking verschlechtern — besonders bei Shops mit Filterfunktionen.",
    nextStep: "In den meisten Shop-Systemen (Shopify, WooCommerce) ist der Canonical automatisch gesetzt. Überprüfe es trotzdem mit einem SEO-Plugin oder frag deinen Entwickler.",
  },
  "core-web-vitals": {
    key: "core-web-vitals",
    title: "Core Web Vitals",
    what: "Core Web Vitals messen, wie schnell und angenehm deine Seite lädt — aus Sicht des Besuchers.",
    whyItMatters: "Seit 2021 sind Core Web Vitals ein direkter Google-Rankingfaktor. Eine langsame Seite verliert Plätze und Besucher.",
    nextStep: "Teste deine Seite kostenlos auf pagespeed.web.dev. Die größten Gewinne kommen meist durch: Bilder komprimieren, unnötige Skripte entfernen, Hosting verbessern.",
  },
  "rankings": {
    key: "rankings",
    title: "Keyword-Rankings",
    what: "Keyword-Rankings zeigen, auf welcher Position deine Seite bei Google für einen bestimmten Suchbegriff erscheint.",
    whyItMatters: "Plätze 1–3 bekommen über 60% der Klicks. Wer auf Seite 2 ist, wird selten gefunden. Bewegungen nach oben bedeuten mehr Besucher.",
    nextStep: "Beobachte die Bewegungen über mehrere Wochen. Konzentriere dich auf Keywords zwischen Position 4–15 — hier sind Verbesserungen am realistischsten.",
  },
};
