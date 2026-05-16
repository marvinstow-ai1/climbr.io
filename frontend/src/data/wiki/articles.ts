import type { WikiArticle } from "./types";

/**
 * Alle Wiki-Artikel als statische TypeScript-Daten. Inhaltlich
 * konservativ formuliert für Shop-Betreiber ohne SEO-Vorkenntnisse —
 * jeder Artikel folgt der Struktur: Was? · Warum? · So gehst du vor.
 *
 * Bilder/Screenshots können Marvin später ergänzen.
 *
 * Body-Syntax: einfacher Markdown mit `##` Überschriften, `-`
 * Aufzählungen und Leerzeilen zwischen Absätzen. Der WikiBody-Renderer
 * verarbeitet das mit einem Mini-Parser (siehe components/wiki/WikiBody.tsx).
 */
export const WIKI_ARTICLES: WikiArticle[] = [
  // ---------- Grundlagen ----------
  {
    slug: "was-ist-seo",
    title: "Was ist SEO und warum brauche ich das?",
    category: "Grundlagen",
    readingTime: 3,
    summary:
      "SEO steht für Suchmaschinenoptimierung. Hier erklären wir, was das konkret bedeutet — und warum es für deinen Shop wichtig ist.",
    body: `
## In einem Satz

SEO ist die Arbeit daran, dass deine Webseite bei Google möglichst weit oben erscheint, wenn jemand nach deinem Produkt oder deiner Dienstleistung sucht.

## Warum das für dich wichtig ist

Über 90% aller Online-Käufe beginnen mit einer Suchanfrage. Wer auf Seite 2 der Google-Ergebnisse landet, wird praktisch nicht mehr gefunden — die ersten drei Treffer bekommen zusammen über 60% aller Klicks.

Für kleine Online-Shops bedeutet das: ohne Sichtbarkeit bei Google fehlt der wichtigste Verkaufskanal. Bezahlte Werbung kann das überbrücken, aber organische Treffer sind langfristig deutlich günstiger.

## Die drei Säulen

- **On-Page SEO:** der Inhalt und die Struktur deiner Seiten. Title-Tags, Überschriften, Texte, Bilder, interne Links.
- **Technisches SEO:** die Technik dahinter. Ladegeschwindigkeit, mobile Darstellung, korrekte Verlinkung, HTTPS.
- **Off-Page SEO:** das was außerhalb deiner Seite passiert. Backlinks von anderen Webseiten, Erwähnungen, Reputation.

## Was du jetzt tun kannst

Starte mit einem climbr.io-Audit. Du bekommst eine priorisierte Liste der wichtigsten Verbesserungspunkte und kannst dich Schritt für Schritt durcharbeiten.
`,
    relatedSlugs: ["wie-funktioniert-google", "seo-score-erklaert", "title-tag"],
  },
  {
    slug: "wie-funktioniert-google",
    title: "Wie funktioniert Google?",
    category: "Grundlagen",
    readingTime: 4,
    summary:
      "Crawler, Index, Ranking — in drei Schritten erklärt, wie deine Seite überhaupt bei Google landet.",
    body: `
## Drei Schritte vom Server zu deinem Kunden

### 1. Crawling

Google schickt Programme (Crawler oder „Bots") los, die das Web durchstöbern. Sie folgen Links, lesen Seiten und melden zurück was sie gefunden haben.

### 2. Indexierung

Was die Crawler gefunden haben, wird in den Google-Index aufgenommen — eine riesige Datenbank aller Webseiten. Hier entscheidet Google: ist diese Seite überhaupt qualitativ gut genug um aufgenommen zu werden?

### 3. Ranking

Sucht ein Nutzer nach einem Begriff, durchforstet Google den Index nach passenden Seiten und sortiert sie nach hunderten Signalen. Die wichtigsten:

- **Relevanz:** passt der Inhalt zur Suche?
- **Qualität:** ist die Seite gut geschrieben, aktuell, vertrauenswürdig?
- **Technik:** lädt die Seite schnell? Funktioniert sie auf dem Handy?
- **Reputation:** verweisen andere Seiten auf diese?

## Was das praktisch bedeutet

Wenn deine Seite nicht bei Google auftaucht, kann das drei Gründe haben:

- Sie wurde noch nicht **gecrawlt** (zu neu, keine Verweise).
- Sie wurde gecrawlt, aber nicht **indexiert** (technische Fehler, robots.txt blockiert, dünner Inhalt).
- Sie ist indexiert, aber **schlecht platziert** (kein passender Inhalt zur Suche, schwache Technik).

Jeder dieser Punkte ist mit gezielten Maßnahmen lösbar.
`,
    relatedSlugs: ["was-ist-seo", "sitemap", "robots-txt"],
  },
  {
    slug: "seo-score-erklaert",
    title: "Was bedeutet mein SEO-Score?",
    category: "Grundlagen",
    readingTime: 2,
    summary:
      "Der Score-Wert von 0–100 in climbr.io — und was er aussagt (und was nicht).",
    body: `
## Was der Score misst

Der SEO-Score in climbr.io ist eine Bewertung von 0–100, die zeigt wie gut deine Seite **technisch und inhaltlich** für Suchmaschinen aufgestellt ist. Er wird automatisch aus deinem Audit berechnet — wir prüfen rund 30 Kriterien (Title-Tag, Meta-Description, H1, Alt-Texte, Ladegeschwindigkeit, HTTPS, …) und gewichten sie nach Bedeutung.

## Die drei Bereiche

- **70–100 (grün):** Deine Seite ist solide aufgestellt. Es gibt Feinschliff, aber die Basis stimmt.
- **40–69 (orange):** Ausbaufähig. Es fehlen wichtige Elemente, die Google zur Bewertung deiner Seite nutzt.
- **0–39 (rot):** Kritisch. Suchmaschinen können deine Seite nicht richtig erfassen — das kostet Sichtbarkeit.

## Was der Score **nicht** sagt

Der Score misst die **Voraussetzungen** für gutes Ranking — nicht das Ranking selbst. Du kannst einen Score von 90 haben und trotzdem nicht in den Top-10 stehen, wenn deine Konkurrenz stärkere Backlinks oder bessere Inhalte hat.

Umgekehrt heißt ein niedriger Score: hier gibt es noch Hausaufgaben. Sie zu erledigen ist die Grundvoraussetzung dafür, dass andere SEO-Maßnahmen (Content, Backlinks) überhaupt wirken können.

## Was du tun solltest

Schau dir die Top-5-Fixes deines Audits an und arbeite sie der Reihe nach ab. Die oberen Punkte haben den größten Effekt.
`,
    relatedSlugs: ["was-ist-seo", "title-tag", "core-web-vitals"],
  },
  {
    slug: "organisch-vs-bezahlt",
    title: "Organische vs. bezahlte Suchergebnisse",
    category: "Grundlagen",
    readingTime: 3,
    summary:
      "Was ist der Unterschied zwischen den ersten paar Treffern (Anzeigen) und den restlichen — und welche Variante lohnt sich wann?",
    body: `
## Zwei Welten auf einer Seite

Wenn du bei Google nach „lederrucksack damen" suchst, siehst du oben drei oder vier Ergebnisse mit einem kleinen „Anzeige"-Tag. Das sind **bezahlte Suchergebnisse** (SEA — Search Engine Advertising). Darunter folgen die **organischen Ergebnisse** — sie kosten kein Geld pro Klick.

## Vergleich auf einen Blick

|                       | Organisch (SEO)        | Bezahlt (SEA)              |
|-----------------------|------------------------|----------------------------|
| Kosten pro Klick      | 0 €                    | je nach Branche 0,50–8 €   |
| Wirkung               | langsam (Monate)       | sofort                     |
| Vertrauen der Nutzer  | hoch                   | niedriger                  |
| Anteil der Klicks     | ~65%                   | ~15%                       |
| Aufwand               | dauerhaft, kumulativ   | dauerhafte Werbeausgaben   |

## Wann lohnt sich was?

- **SEA (Anzeigen):** wenn du **sofort** Traffic brauchst (Launch, Saison, Aktion) oder wenn du testen willst ob ein neues Produkt Nachfrage hat.
- **SEO (organisch):** wenn du **langfristig** Sichtbarkeit aufbauen willst, ohne pro Besucher zu zahlen.

Die meisten kleinen Shops fahren am besten mit einer Mischung: SEA zum Start, SEO als langfristige Strategie.

## Realität-Check

Organische Top-Platzierungen kommen nicht über Nacht. Rechne mit 3–6 Monaten konsequenter Arbeit, bis erste Effekte sichtbar werden — bei stark umkämpften Keywords auch länger.
`,
    relatedSlugs: ["was-ist-seo", "keyword-recherche"],
  },

  // ---------- On-Page SEO ----------
  {
    slug: "title-tag",
    title: "Title Tag optimieren",
    category: "On-Page SEO",
    readingTime: 3,
    summary:
      "Der Title-Tag ist die Überschrift in den Google-Ergebnissen. Das Erste was deine Kunden sehen — und ein direkter Rankingfaktor.",
    body: `
## Was der Title-Tag ist

Der Title-Tag ist ein HTML-Element im \`<head>\` deiner Seite:

\`\`\`html
<title>Lederrucksack Damen — handgefertigt | climbr Shop</title>
\`\`\`

Google nutzt diesen Text als blaue Überschrift in den Suchergebnissen und als Tab-Beschriftung im Browser.

## Warum er so wichtig ist

- Er ist **ein direkter Rankingfaktor**: enthält dein Title-Tag das gesuchte Keyword, steigen die Chancen für eine bessere Platzierung deutlich.
- Er beeinflusst die **Klickrate**: ein interessanter Title bringt mehr Besucher, auch wenn deine Position gleich bleibt.

## Die Formel für einen guten Title

1. **Länge:** 50–60 Zeichen. Kürzer wirkt dünn, länger schneidet Google ab.
2. **Hauptkeyword vorn:** „Lederrucksack Damen — …" funktioniert besser als „Bei uns findest du Lederrucksäcke für Damen".
3. **Mehrwert oder USP:** „handgefertigt", „CO₂-neutral", „seit 1998" — was unterscheidet dich?
4. **Markenname am Ende:** mit \`|\` oder \`—\` getrennt.

## Häufige Fehler

- Auf jeder Seite derselbe Title (z.B. „Startseite | Mein Shop").
- Keywords aneinandergereiht ohne natürliche Sprache („Lederrucksack Damen kaufen günstig bestellen").
- Wichtige Keywords ans Ende — Google kürzt sie weg.

## So passt du es an

In den meisten Shop-Systemen (Shopify, WooCommerce, Shopware) findest du das Title-Feld in den SEO-Einstellungen jeder Seite oder jedes Produkts. Bei selbst gebauten Seiten editierst du den \`<title>\`-Tag direkt.
`,
    relatedSlugs: ["meta-description", "h1-h2-h3"],
  },
  {
    slug: "meta-description",
    title: "Meta-Description schreiben",
    category: "On-Page SEO",
    readingTime: 3,
    summary:
      "Die zwei Zeilen unter dem blauen Titel in den Suchergebnissen — kein Rankingfaktor, aber entscheidend für die Klickrate.",
    body: `
## Was sie ist

Die Meta-Description ist eine kurze Beschreibung deiner Seite, die in den Google-Suchergebnissen unter dem Title-Tag erscheint:

\`\`\`html
<meta name="description" content="Handgefertigte Lederrucksäcke für den Alltag. Nachhaltig produziert in Deutschland, lebenslange Reparatur-Garantie. Versand portofrei ab 80 €.">
\`\`\`

## Kein direkter Rankingfaktor — aber sehr wichtig

Google bestätigt offiziell: die Meta-Description ist **kein** Rankingfaktor. Sie verbessert deine Position also nicht direkt.

**Aber:** sie entscheidet maßgeblich, ob jemand auf dein Ergebnis klickt. Eine gute Meta-Description kann die Klickrate verdoppeln, ohne dass deine Position sich ändert — und mehr Besucher bedeuten mehr Umsatz.

## Die Formel

- **Länge:** 120–160 Zeichen. Längere Texte werden abgeschnitten („…").
- **Hauptkeyword einbauen:** Google fettet es im Suchergebnis.
- **Nutzen klar machen:** was bekommt der Kunde?
- **Call-to-Action:** „jetzt entdecken", „kostenlos testen", „in 24h geliefert".

## Beispiele

**Schlecht:** „Willkommen auf unserer Seite. Wir bieten verschiedene Produkte an. Klicken Sie hier um mehr zu erfahren."

**Gut:** „Handgefertigte Lederrucksäcke für Damen. Nachhaltig, in Deutschland produziert. Versand portofrei ab 80 €, 30 Tage Rückgaberecht."

## Was wenn ich keine setze?

Google generiert automatisch eine Description aus deinem Seiteninhalt. Das kann passen — meistens ist es aber besser, sie selbst zu schreiben.
`,
    relatedSlugs: ["title-tag", "h1-h2-h3"],
  },
  {
    slug: "h1-h2-h3",
    title: "Überschriften richtig einsetzen",
    category: "On-Page SEO",
    readingTime: 3,
    summary:
      "H1, H2, H3 — wie du Überschriften so strukturierst, dass sowohl Google als auch deine Leser sich zurechtfinden.",
    body: `
## Warum Überschriften für SEO zählen

Überschriften (HTML: \`<h1>\`, \`<h2>\`, \`<h3>\` …) geben deiner Seite Struktur. Google nutzt sie um zu verstehen, worum es auf der Seite geht und welche Themen wie wichtig sind.

## Die Regeln

### Genau **eine H1** pro Seite

Die H1 ist die Haupt-Überschrift. Sie sagt: „Darum geht es auf dieser Seite." Mehr als eine H1 verwirrt Google.

\`\`\`html
<h1>Lederrucksäcke für Damen</h1>
\`\`\`

### Logische Hierarchie

H2 sind Abschnitte unter der H1, H3 Unterabschnitte unter H2, usw. Springe keine Ebenen.

\`\`\`
H1: Lederrucksäcke für Damen
  H2: Materialien
    H3: Vollnarbleder
    H3: Nappa
  H2: Pflege
\`\`\`

### Keywords natürlich einbauen

Deine Hauptkeywords sollten in der H1 und mindestens einer H2 vorkommen — aber gezwungen klingen darf es nicht.

## Häufige Fehler

- **Optisch statt strukturell:** „Großer Text" gemacht mit \`<div class="big">\`, nicht mit \`<h1>\`. Google sieht das nicht als Überschrift.
- **H1 ist das Logo:** viele Themes packen das Site-Logo in eine H1 — dann fehlt die echte Seiten-Überschrift.
- **Keine Hierarchie:** alles H1, oder wild gemischt.

## Wie du es prüfst

- In Chrome: Rechtsklick auf die Überschrift → „Untersuchen" → siehe das HTML-Tag.
- In WordPress/Shopify: das CMS bietet meist eine „Überschrift 1/2/3"-Auswahl im Texteditor — die mappt auf H1/H2/H3.
`,
    relatedSlugs: ["title-tag", "meta-description"],
  },
  {
    slug: "alt-texte",
    title: "Alt-Texte für Bilder",
    category: "On-Page SEO",
    readingTime: 2,
    summary:
      "Was beim Bild steht, wenn es nicht angezeigt werden kann — wichtig für Google, Barrierefreiheit und Bildersuche.",
    body: `
## Was ein Alt-Text ist

Der Alt-Text (kurz für „alternative text") beschreibt ein Bild in Worten:

\`\`\`html
<img src="rucksack-rot.jpg" alt="Roter Lederrucksack für Damen, Modell Alma">
\`\`\`

## Warum er wichtig ist

- **Google kann Bilder nicht sehen.** Der Alt-Text ist die einzige Möglichkeit, der Suchmaschine zu erklären was auf dem Bild zu sehen ist.
- **Bildersuche:** mit guten Alt-Texten landen deine Produktbilder in Google Bilder — eine eigene Traffic-Quelle.
- **Barrierefreiheit:** Screenreader lesen den Alt-Text vor. Für sehbehinderte Nutzer ist das oft die einzige Information zum Bild.
- **Fallback:** wenn ein Bild nicht lädt, zeigt der Browser den Alt-Text an.

## So schreibst du gute Alt-Texte

- **Beschreibend, nicht generisch.** „Roter Lederrucksack Damen Größe 40x30 cm" ist besser als „Bild" oder „rucksack.jpg".
- **Wenn passend, ein Keyword einbauen.** Aber nicht mit Keywords vollstopfen.
- **Kurz und präzise.** 5–15 Wörter reichen meist.
- **Bei Dekobildern leer lassen:** \`alt=""\` — so überspringen Screenreader sie.

## Beispiele

| Schlecht                     | Gut                                                  |
|------------------------------|------------------------------------------------------|
| \`alt="img-2342"\`             | \`alt="Lederrucksack Alma in Rot von der Seite"\`     |
| \`alt="rucksack"\`             | \`alt="Brauner Lederrucksack mit Schnallenverschluss"\` |
| \`alt=""\` (bei Produktfoto)   | Beschreibe das Produkt                               |
| \`alt=""\` (bei dekorativer Linie) | korrekt — leer lassen                            |

## Wo du es einstellst

In Shopify, WooCommerce, Shopware: beim Hochladen oder Bearbeiten eines Bildes gibt es ein Feld „Alt-Text" oder „Alternativer Text".
`,
    relatedSlugs: ["title-tag", "core-web-vitals"],
  },
  {
    slug: "interne-verlinkung",
    title: "Interne Verlinkung aufbauen",
    category: "On-Page SEO",
    readingTime: 3,
    summary:
      "Wie du mit Links zwischen deinen eigenen Seiten Google hilfst, deine Inhalte zu verstehen — und deine Besucher länger auf der Seite hältst.",
    body: `
## Was interne Verlinkung ist

Interne Links sind Verlinkungen **zwischen Seiten deiner eigenen Domain**. Z.B. von einer Blogseite zu einer Produktseite, oder von einer Kategorie zu einer anderen.

## Warum sie wichtig sind

- **Crawling:** Google folgt Links. Was nicht verlinkt ist, bleibt schwer auffindbar.
- **Themen-Kontext:** mehrere Seiten zum selben Thema, die sich gegenseitig verlinken, signalisieren „hier liegt Expertise".
- **Ranking-Verteilung:** Seiten mit vielen internen Links bekommen mehr „Power" — Google sieht sie als wichtiger.
- **UX:** Besucher springen von einer interessanten Seite zur nächsten und bleiben länger auf der Domain.

## Praktische Regeln

### Beschreibende Linktexte

\`\`\`
schlecht: "Mehr Infos findest du hier."
gut:      "So pflegst du deinen Lederrucksack."
\`\`\`

Der Linktext (auch Anchor-Text) sollte zum Thema der Zielseite passen — Google nutzt ihn als Signal dafür, worum es auf der verlinkten Seite geht.

### Sinnvoll verlinken

Verlinke wo es dem Leser hilft — nicht künstlich auf jedem Wort. Frag dich: würde ich diesen Link auch ohne SEO-Hintergedanken setzen?

### Hub-Seiten

Erstelle „Sammelseiten" zu deinen Hauptthemen, die zu allen Unterseiten verlinken. Beispiel: eine Seite „Lederpflege" verlinkt zu Pflegetipps, einzelnen Produkten und passenden Pflegemitteln.

## Häufige Fehler

- **Verwaiste Seiten:** Produktseiten ohne eingehende Links. Sie sind für Google praktisch unsichtbar.
- **„Klick hier" als Linktext:** keine Information für Google.
- **Zu viele Links auf einer Seite:** verwässert die Wirkung. 50–100 sinnvolle Links sind okay, 500 sind zu viel.
`,
    relatedSlugs: ["title-tag", "duplicate-content"],
  },
  {
    slug: "duplicate-content",
    title: "Duplicate Content vermeiden",
    category: "On-Page SEO",
    readingTime: 3,
    summary:
      "Gleicher Inhalt auf mehreren URLs verwirrt Google — und schadet deinem Ranking. So findest du Duplikate und vermeidest sie.",
    body: `
## Was Duplicate Content ist

Wenn derselbe oder fast identische Text auf mehreren URLs erreichbar ist, spricht man von Duplicate Content. Google muss dann entscheiden, welche Version „die echte" ist — und ranked oft keine besonders gut.

## Typische Quellen in Online-Shops

- **Filter-URLs:** \`/rucksaecke?farbe=rot\`, \`/rucksaecke?farbe=blau\` — gleicher Inhalt mit unterschiedlicher Sortierung.
- **Sessions in der URL:** \`?sessionid=xyz\` an jeder URL.
- **HTTP und HTTPS:** dieselbe Seite unter \`http://\` und \`https://\` erreichbar.
- **Mit und ohne \`www\`:** \`example.com\` und \`www.example.com\`.
- **Trailing Slash:** \`/produkte\` und \`/produkte/\` als zwei verschiedene Seiten.
- **Hersteller-Texte kopiert:** ohne Anpassung in mehreren Shops gleich.

## Was Google macht

Google bestraft Duplicate Content **nicht** aktiv (das ist ein Mythos). Aber:

- Die Ranking-Power verteilt sich auf mehrere URLs statt sich auf einer zu konzentrieren.
- Google entscheidet selbst welche Version es zeigt — vielleicht nicht deine bevorzugte.
- Mit der Zeit wirkt deine Seite weniger „originell".

## Lösungen

### Canonical-Tag

Sag Google explizit, welche URL die Original-Version ist:

\`\`\`html
<link rel="canonical" href="https://example.com/lederrucksack-alma">
\`\`\`

(Mehr dazu im Artikel zum [Canonical Tag](#canonical).)

### 301-Redirects

HTTP → HTTPS und \`www\`-Variante per Server-Weiterleitung. Das macht dein Hosting-Anbieter in der Regel automatisch.

### Hersteller-Texte umschreiben

Schreibe Produkttexte zumindest in Teilen selbst. Kurze eigene Einleitung + Hersteller-Specs ist schon viel besser als reines Copy-Paste.

## So findest du Duplikate

- Kopiere einen Satz aus deiner Seite und such ihn bei Google in Anführungszeichen — siehst du mehrere eigene Seiten?
- Tools wie Screaming Frog oder Sitebulb listen Duplikate auf.
- In der Google Search Console: Bericht „Abdeckung" → „Duplikat".
`,
    relatedSlugs: ["canonical-tag", "interne-verlinkung"],
  },

  // ---------- Technisches SEO ----------
  {
    slug: "canonical-tag",
    title: "Canonical Tag erklärt",
    category: "Technisches SEO",
    readingTime: 3,
    summary:
      "Wenn dieselbe Seite unter mehreren URLs erreichbar ist, sagt der Canonical-Tag Google: das ist die echte Version.",
    body: `
## Wofür der Canonical-Tag da ist

Stell dir vor, dein Lederrucksack ist über drei URLs erreichbar:

- \`/produkte/alma\`
- \`/produkte/alma?ref=newsletter\`
- \`/produkte/alma?farbe=rot&sort=preis\`

Inhaltlich ist das alles dieselbe Seite. Ohne Canonical-Tag muss Google selbst raten, welche URL die „eigentliche" ist — und verteilt die Ranking-Signale auf alle drei. Mit Canonical-Tag sagst du klar: „Bitte indexiere nur \`/produkte/alma\`."

## So sieht der Tag aus

Im \`<head>\` der HTML-Seite:

\`\`\`html
<link rel="canonical" href="https://example.com/produkte/alma">
\`\`\`

Die Canonical-URL sollte:
- absolut sein (mit \`https://\`)
- die bevorzugte Domain-Variante nutzen (mit oder ohne \`www\` — konsistent!)
- nicht auf eine Seite mit \`noindex\` zeigen

## Wann du ihn brauchst

- Bei **Filter-Seiten** in Shops (Sortier-, Farb-, Preisfilter)
- Bei **Paginierung** (Seite 2, 3, 4 einer Kategorie können auf Seite 1 zeigen — oder bleiben self-canonical)
- Bei **Tracking-Parametern** (\`?utm_source=...\`)
- Bei **Druck-Versionen** oder **AMP-Varianten**

## In Shopify, WooCommerce & Co

Die meisten Shop-Systeme setzen Canonical-Tags **automatisch** korrekt. Prüfen lohnt sich trotzdem:

1. Öffne eine Filter-URL deiner Seite im Browser.
2. Rechtsklick → „Seitenquelltext anzeigen".
3. Such nach \`rel="canonical"\` — auf welche URL zeigt er?

## Häufiger Fehler

Der Canonical zeigt auf die Startseite (statt auf die richtige Produkt-/Kategorie-Seite). Das passiert manchmal bei selbst gebauten Themes oder fehlerhaften Plugins — und bedeutet faktisch: deine Produktseiten werden nicht indexiert.
`,
    relatedSlugs: ["duplicate-content", "sitemap"],
  },
  {
    slug: "robots-txt",
    title: "robots.txt verstehen",
    category: "Technisches SEO",
    readingTime: 2,
    summary:
      "Die kleine Textdatei, mit der du Suchmaschinen sagst was sie crawlen dürfen — und was nicht.",
    body: `
## Was sie ist

Die \`robots.txt\` ist eine einfache Textdatei, die du auf der obersten Ebene deiner Domain ablegst:

\`\`\`
https://example.com/robots.txt
\`\`\`

Sie gibt Suchmaschinen-Crawlern Anweisungen wie:

\`\`\`
User-agent: *
Disallow: /admin/
Disallow: /checkout/
Allow: /

Sitemap: https://example.com/sitemap.xml
\`\`\`

## Was die Zeilen bedeuten

- \`User-agent: *\` — gilt für alle Crawler.
- \`Disallow: /admin/\` — bitte \`/admin\` und alles darunter nicht crawlen.
- \`Allow: /\` — alles andere ist erlaubt.
- \`Sitemap:\` — wo deine Sitemap liegt (Google findet sie schneller).

## Wichtige Begriffe

- **Crawling-Verbot ≠ Indexierungs-Verbot.** Eine über \`Disallow\` blockierte Seite kann trotzdem im Index landen, wenn andere Seiten darauf verlinken. Wenn du eine Seite **ganz** aus Google fernhalten willst, nutze stattdessen \`<meta name="robots" content="noindex">\`.
- Die \`robots.txt\` ist eine **Bitte**, kein Zwang. Seriöse Crawler (Googlebot, Bingbot) halten sich daran, böswillige Bots ignorieren sie.

## Was du **nicht** blockieren solltest

- CSS- und JS-Dateien — sonst kann Google deine Seite nicht richtig rendern und bewerten.
- Die Sitemap.
- Eigentlich wichtige Bereiche deiner Seite.

## Was du blockieren kannst

- Admin-/Backend-Bereiche.
- Checkout-Seiten und Warenkorb (dynamische Inhalte ohne Sitemap-Wert).
- Filter- und Sortier-URLs (alternativ: Canonical-Tag).

## So prüfst du sie

In der Google Search Console: „Einstellungen" → „Crawling" → robots.txt-Tester. Hier kannst du sehen welche Regel für welche URL greift.
`,
    relatedSlugs: ["sitemap", "wie-funktioniert-google"],
  },
  {
    slug: "sitemap",
    title: "XML-Sitemap erstellen",
    category: "Technisches SEO",
    readingTime: 2,
    summary:
      "Eine Liste aller deiner Seiten, die du Google direkt zur Verfügung stellst — damit nichts übersehen wird.",
    body: `
## Was sie ist

Eine XML-Sitemap ist eine maschinenlesbare Liste aller URLs deiner Seite. Sie liegt in der Regel unter:

\`\`\`
https://example.com/sitemap.xml
\`\`\`

Ein Eintrag sieht so aus:

\`\`\`xml
<url>
  <loc>https://example.com/produkte/alma</loc>
  <lastmod>2026-05-01</lastmod>
</url>
\`\`\`

## Wozu

- Google findet deine Seiten **schneller** — besonders neue Produkte oder Blogartikel.
- Du gibst Hinweise wann etwas **zuletzt geändert** wurde — Google priorisiert das Re-Crawling entsprechend.
- Bei Seiten ohne starke interne Verlinkung ist die Sitemap manchmal der einzige Weg, wie Google von ihnen erfährt.

## Wer sie erzeugt

- **Shopify:** automatisch unter \`/sitemap.xml\`.
- **WooCommerce:** mit dem Plugin Rank Math, Yoast SEO oder All-in-One-SEO.
- **Shopware:** automatisch nach Aktivierung in den Einstellungen.
- **Eigene Seite:** Tools wie xml-sitemaps.com erzeugen sie einmalig, für laufende Aktualisierung brauchst du ein Plugin oder eigenen Build-Schritt.

## Einreichen bei Google

1. Trage deine Sitemap-URL in die Google Search Console ein: „Sitemaps" → URL eingeben → „Senden".
2. Erwähne sie in der \`robots.txt\`: \`Sitemap: https://example.com/sitemap.xml\`.

## Häufige Fehler

- Sitemap enthält **404er** (gelöschte Seiten).
- Sitemap enthält Seiten mit **\`noindex\`** — dann werden sie nicht indexiert, du verwirrst Google.
- Sitemap wird **nicht aktualisiert** wenn neue Seiten entstehen.
`,
    relatedSlugs: ["robots-txt", "wie-funktioniert-google"],
  },
  {
    slug: "core-web-vitals",
    title: "Core Web Vitals und Seitengeschwindigkeit",
    category: "Technisches SEO",
    readingTime: 4,
    summary:
      "Die drei Kennzahlen, mit denen Google misst wie schnell und angenehm deine Seite lädt — und seit 2021 ein offizieller Rankingfaktor.",
    body: `
## Die drei Vitals

### LCP — Largest Contentful Paint

Wie lange dauert es, bis das größte sichtbare Element (meist das Hero-Bild oder die Hauptüberschrift) geladen ist?

- ✅ unter 2,5 Sekunden
- ⚠ 2,5–4 s
- ❌ über 4 s

### INP — Interaction to Next Paint

Wie schnell reagiert die Seite auf Klicks und Eingaben? (Ersetzt seit März 2024 die alte FID-Metrik.)

- ✅ unter 200 ms
- ⚠ 200–500 ms
- ❌ über 500 ms

### CLS — Cumulative Layout Shift

Wie sehr „springt" der Inhalt während des Ladens? Wenn ein Button plötzlich an einer anderen Stelle erscheint, weil ein Bild nachgeladen wird, ist das ein hoher CLS.

- ✅ unter 0,1
- ⚠ 0,1–0,25
- ❌ über 0,25

## Warum sie zählen

Seit 2021 sind die Core Web Vitals offizieller Rankingfaktor. Eine langsame Seite verliert:

- Plätze bei Google
- Besucher (53% verlassen die Seite wenn sie länger als 3 s lädt)
- Conversion-Raten

## So testest du deine Seite

- **PageSpeed Insights:** kostenlos unter https://pagespeed.web.dev. Gibt dir eine konkrete Note + To-Do-Liste.
- **Google Search Console:** „Core Web Vitals"-Bericht — zeigt echte Daten von echten Nutzern.

## Die größten Hebel

1. **Bilder komprimieren** und im modernen WebP-/AVIF-Format ausliefern. Spart oft 60–80% Dateigröße.
2. **Bilder mit \`width\`/\`height\`** versehen — verhindert CLS.
3. **Lazy Loading** für Bilder unter dem Fold: \`loading="lazy"\`.
4. **Unnötige JavaScript-Plugins entfernen** (Cookie-Banner, Live-Chats, Analytics).
5. **Schnelles Hosting**: bei langsamer Server-Antwort hilft kein Frontend-Tuning.
6. **CDN** nutzen (Cloudflare, Vercel) — liefert deine Seite vom nächstgelegenen Server.

## Pro-Tipp

Bei Shopify/WooCommerce-Themes: such nach Themes die explizit als „schnell" oder „performance-optimiert" beworben werden. Ein langsames Theme lässt sich nachträglich nur schwer fixen.
`,
    relatedSlugs: ["mobile-first", "alt-texte"],
  },
  {
    slug: "https-ssl",
    title: "HTTPS und SSL",
    category: "Technisches SEO",
    readingTime: 2,
    summary:
      "Das kleine Schloss in der Browserzeile — heute Pflicht, nicht Kür.",
    body: `
## Was HTTPS ist

HTTPS ist die verschlüsselte Variante von HTTP. Die Daten zwischen deinem Server und dem Browser des Besuchers werden so vor Mitlesen geschützt. Im Browser erscheint ein Schloss-Symbol vor der URL.

Für HTTPS brauchst du ein SSL-/TLS-Zertifikat. Heute gibt es das kostenlos (Let's Encrypt) — alle modernen Hosting-Anbieter richten es automatisch ein.

## Warum es Pflicht ist

- **Rankingfaktor:** Google bevorzugt seit 2014 explizit HTTPS-Seiten.
- **Vertrauen:** Chrome markiert Nicht-HTTPS-Seiten mit „Nicht sicher". Wer kauft schon auf einer „nicht sicheren" Seite ein?
- **DSGVO:** Bei der Übertragung personenbezogener Daten (Login, Kauf, Kontaktformular) ist Verschlüsselung Pflicht.
- **Moderne Browser-Features** (Service Worker, Geolocation, Push-Notifications) funktionieren nur über HTTPS.

## So prüfst du es

- Schloss-Symbol vor deiner URL im Browser sichtbar?
- \`https://\` statt \`http://\` in der Adressleiste?
- Aufruf mit \`http://\` leitet automatisch auf \`https://\` um?

## Häufige Fehler

- **Mixed Content:** die Seite läuft über HTTPS, lädt aber einzelne Bilder oder Scripts über HTTP. Browser blockieren das teilweise.
- **HTTP-Variante nicht weitergeleitet:** \`http://example.com\` und \`https://example.com\` sind beide erreichbar → Duplicate Content + SEO-Verlust.
- **Abgelaufenes Zertifikat:** vergiss das Auto-Renewal nicht. Bei Let's Encrypt ist das normalerweise voreingestellt.

## Was zu tun ist wenn du noch HTTP nutzt

Sprich mit deinem Hoster — die Umstellung ist heute meist ein Klick. Vergiss nicht: nach der Umstellung in der Google Search Console eine **neue Property** für die HTTPS-Variante anlegen und die Sitemap dort neu einreichen.
`,
    relatedSlugs: ["mobile-first", "duplicate-content"],
  },
  {
    slug: "mobile-first",
    title: "Mobile-First Indexing",
    category: "Technisches SEO",
    readingTime: 3,
    summary:
      "Google bewertet deine Seite primär auf Basis der mobilen Version — egal wie schön die Desktop-Variante aussieht.",
    body: `
## Was es bedeutet

Seit 2023 indexiert Google **alle** Seiten primär in ihrer mobilen Variante. Das heißt: für die Bewertung deiner Seite zählt das, was Google auf einem Smartphone-Display sieht — Desktop ist sekundär.

## Warum das wichtig ist

- Mehr als 60% aller Suchen passieren auf dem Handy.
- Wenn deine mobile Variante schlechter ist als die Desktop-Variante, leidet dein Ranking — auch bei Suchen vom Desktop.

## Worauf du achten musst

### Inhalt 1:1 verfügbar

Alles was auf dem Desktop steht, sollte auch mobil sichtbar sein. Versteckte Tabs oder „mobil ausblenden"-Regeln werden von Google teilweise nicht erkannt.

### Lesbarkeit

- Schrift mindestens 16 px.
- Buttons groß genug zum Tippen (mindestens 44×44 px).
- Abstand zwischen klickbaren Elementen.

### Schnelle Ladezeit

Mobile Nutzer sind ungeduldiger. Die Core Web Vitals (siehe entsprechender Artikel) sollten besonders mobil im grünen Bereich liegen.

### Kein horizontales Scrollen

Wenn der Nutzer seitlich scrollen muss, ist dein Layout kaputt. Test: \`<meta name="viewport" content="width=device-width, initial-scale=1">\` im \`<head>\`.

### Pop-ups vermeiden

Aufdringliche Interstitials (Pop-ups, die den halben Bildschirm bedecken) bestraft Google. Dünne Cookie-Banner oder Newsletter-Boxen sind okay.

## So testest du es

- **Mobile-Friendly-Test** von Google: search.google.com/test/mobile-friendly
- **Browser-DevTools:** Chrome → F12 → Smartphone-Icon oben links → simuliert verschiedene Mobil-Geräte.
- **Google Search Console:** Bericht „Mobile Usability" zeigt Probleme aus echten Crawls.

## Bei Shopify/WooCommerce/Shopware

Praktisch alle aktuellen Themes sind responsive. Probleme entstehen meist durch eigene CSS-Anpassungen oder veraltete Plugins.
`,
    relatedSlugs: ["core-web-vitals", "https-ssl"],
  },

  // ---------- Keywords ----------
  {
    slug: "was-sind-keywords",
    title: "Was sind Keywords?",
    category: "Keywords",
    readingTime: 2,
    summary:
      "Die Begriffe, mit denen deine Kunden bei Google suchen — und der Ausgangspunkt jeder SEO-Strategie.",
    body: `
## Definition

Ein Keyword (auf Deutsch: „Schlüsselwort" oder „Suchbegriff") ist der Begriff oder die Wortfolge, die jemand bei Google eingibt. Beispiele:

- „rucksack" — kurz, sehr generisch
- „lederrucksack damen" — schon spezifischer
- „handgefertigter lederrucksack damen schwarz nachhaltig" — sehr konkret

## Warum sie zentral sind

Wenn du nicht weißt **wonach** deine Kunden suchen, kannst du deine Inhalte nicht darauf ausrichten. Keywords sind die Brücke zwischen dem was du anbietest und dem was Kunden in Worte fassen.

## Drei Arten von Keywords nach Intent

### Informational („möchte etwas wissen")

- „was kostet ein guter lederrucksack"
- „wie pflege ich leder"

Nutzer ist in der Recherche-Phase. Bietet sich an für Blog-Inhalte.

### Navigational („möchte zu einer bestimmten Seite")

- „climbr.io login"
- „bestseller von mein-shop"

Nutzer kennt dich schon. Hier brauchst du wenig SEO — wer dich sucht, findet dich.

### Transactional („möchte kaufen")

- „lederrucksack damen kaufen"
- „roter rucksack 25 liter bestellen"

Höchster wirtschaftlicher Wert. Hier solltest du mit Produktseiten ranken.

## Wie du anfängst

1. Schreib auf welche Wörter dir spontan zu deinem Produkt einfallen.
2. Frag drei Freunde oder Kunden „wonach würdest du suchen wenn du X kaufen willst?"
3. Tippe deinen Hauptbegriff bei Google ein und schau dir die Autocomplete-Vorschläge an.

Mehr dazu im Artikel „Keyword-Recherche für Anfänger".
`,
    relatedSlugs: ["keyword-recherche", "longtail-keywords", "suchintention"],
  },
  {
    slug: "keyword-recherche",
    title: "Keyword-Recherche für Anfänger",
    category: "Keywords",
    readingTime: 4,
    summary:
      "In sechs Schritten zu einer Keyword-Liste, mit der du deinen Shop ausrichten kannst.",
    body: `
## Schritt 1: Brainstorming

Schreib in zehn Minuten alle Wörter auf die dir zu deinem Geschäft einfallen. Keine Bewertung, einfach raus damit.

## Schritt 2: Google-Autocomplete nutzen

Tippe deine Hauptbegriffe bei Google ein und schau, welche Vorschläge erscheinen. Das sind echte, häufig gesuchte Anfragen.

\`\`\`
lederrucksack [Tab]
→ lederrucksack damen
→ lederrucksack klein
→ lederrucksack mit laptopfach
\`\`\`

## Schritt 3: „Verwandte Suchanfragen" am Ende der Google-Ergebnisse

Scroll bei deinen Hauptbegriffen ans Ende der Seite — Google zeigt dort 8 verwandte Suchen, die viele Nutzer auch eingeben.

## Schritt 4: Wettbewerber checken

Schau dir die Title-Tags und Überschriften der Top-3-Ergebnisse für deine Keywords an. Welche Wörter tauchen immer wieder auf? Das sind starke Kandidaten.

## Schritt 5: Suchvolumen einschätzen

Tools wie der **Google Ads Keyword-Planer** (kostenlos mit Google-Account), **Ubersuggest** oder **Mangools KWFinder** zeigen ungefähre Suchvolumen pro Monat.

Grobe Orientierung für kleine Shops:
- **< 100 Suchen/Monat:** vermutlich zu wenig Volumen
- **100–1.000:** Sweet Spot für Long-Tail, oft mit niedriger Konkurrenz
- **1.000–10.000:** umkämpft, aber lohnend
- **> 10.000:** harter Wettbewerb, nur mit starkem Content erreichbar

## Schritt 6: In Kategorien sortieren

Bündele deine Keywords nach Themen. Jedes Themenbündel wird später eine eigene Seite (Kategorie oder Blogartikel) bei dir.

## Was du nicht tun solltest

- **Keyword-Stuffing:** ein Keyword 20-mal in einen Text packen. Wirkt unnatürlich und wird bestraft.
- **Konkurrenz mit den Großen:** als kleiner Shop nicht versuchen für „rucksack" zu ranken — das schaffst du nicht. Fokussier auf spezifische Long-Tails.
- **Keywords sammeln, nie umsetzen:** die beste Recherche bringt nichts ohne Content. Setz dir Deadlines.
`,
    relatedSlugs: ["was-sind-keywords", "longtail-keywords", "suchintention"],
  },
  {
    slug: "longtail-keywords",
    title: "Long-Tail Keywords",
    category: "Keywords",
    readingTime: 3,
    summary:
      "Spezifische, längere Suchanfragen — weniger Suchvolumen, aber realistisch erreichbar und mit hoher Kaufabsicht.",
    body: `
## Was Long-Tail-Keywords sind

Long-Tail-Keywords sind längere, spezifischere Suchanfragen — meist drei oder mehr Wörter:

| Generic                | Long-Tail                                                  |
|------------------------|------------------------------------------------------------|
| „rucksack"             | „lederrucksack damen handgemacht braun"                     |
| „kaffeemaschine"       | „kaffeemaschine mit milchaufschäumer für kleine küche"       |
| „yoga"                 | „yoga für rückenschmerzen anfänger zuhause"                  |

## Warum sie für kleine Shops Gold wert sind

- **Weniger Konkurrenz:** kaum jemand optimiert auf Long-Tail-Keywords. Du hast realistische Chancen auf Top-Platzierungen.
- **Höhere Kaufabsicht:** wer „lederrucksack damen handgemacht braun" sucht, will fast schon kaufen. Wer „rucksack" sucht, ist im Recherche-Modus.
- **Bessere Conversion:** die Klickrate **und** die Konvertierung sind bei Long-Tail meist doppelt so hoch wie bei generischen Keywords.
- **Skalierbar:** statt einer Seite die für ein Mega-Keyword rankt, hast du 50 Seiten für Long-Tails. Summiert sich.

## Die 80/20-Regel

In den meisten Branchen kommen **80% des organischen Traffics von 20% der Keywords** — und in diesen 20% stecken überwiegend Long-Tails.

## Wo du sie findest

- **Autocomplete-Vorschläge** in Google.
- **„People also ask"-Box** in den Suchergebnissen — die Fragen sind oft perfekte Long-Tail-Anfragen.
- **AnswerThePublic** (kostenloses Tool): visualisiert Fragen rund um ein Keyword.
- **Eigene Suchen-Logs:** wenn du eine Suchfunktion im Shop hast, schau was Besucher dort eintippen.

## So setzt du sie um

- **Produktseiten:** Title-Tag und H1 mit dem spezifischen Long-Tail.
- **Kategorie-Texte:** ein Kategorie kann mehrere Long-Tails abdecken (z.B. „lederrucksäcke für damen", „handgemachte lederrucksäcke", „nachhaltige lederrucksäcke").
- **Blog-Artikel:** Frage-Long-Tails („wie pflege ich lederrucksack") werden mit Ratgebern bedient.
`,
    relatedSlugs: ["keyword-recherche", "suchintention", "was-sind-keywords"],
  },
  {
    slug: "keyword-tracking",
    title: "Keyword-Rankings tracken",
    category: "Keywords",
    readingTime: 3,
    summary:
      "Warum es nicht reicht, einmalig zu optimieren — und wie du Bewegung in deinen Positionen mitbekommst.",
    body: `
## Warum tracken?

Suchmaschinen-Rankings ändern sich täglich. Was heute auf Position 5 steht, kann morgen auf 12 sein — wegen:

- Algorithmus-Updates von Google
- Neuer Konkurrenz die deine Inhalte überholt
- Eigener Änderungen die du oder dein Theme-Update vorgenommen haben
- Saisonalen Schwankungen

Ohne Tracking siehst du diese Bewegungen nicht — und reagierst zu spät.

## Was du tracken solltest

- **Deine wichtigsten 5–20 Keywords.** Mehr ist nicht nötig wenn du gerade anfängst.
- **Eine Mischung aus generischen und Long-Tail-Keywords.**
- **Mindestens zwei Keywords pro wichtiger Seite.**

## So funktioniert es in climbr.io

1. Geh in dein Projekt → Tab „Rankings".
2. Füg ein Keyword hinzu (z.B. „lederrucksack damen").
3. Du siehst die aktuelle Position und einen Verlauf der letzten 14 Tage.
4. Wenn du **Google Search Console** verbindest, bekommst du echte Positions-Daten direkt von Google — sonst geschätzte Werte.

## Was die Bewegungen bedeuten

- **Plus 1–3 Plätze:** normales Rauschen. Kein Anlass zur Sorge oder Freude.
- **Plus/Minus 4+ Plätze:** signifikante Bewegung. Schau dir an was sich geändert hat.
- **Sprung in/aus den Top-10:** großer Effekt. Hier zählt jede Position — auf Position 11 bist du auf Seite 2 und damit praktisch unsichtbar.

## Realistische Erwartungen

Bei neuen Seiten oder neuen Optimierungen dauert es typischerweise **1–6 Wochen** bis Google Änderungen verarbeitet. Geduld ist Pflicht — wer alle zwei Tage am Title-Tag schraubt verwirrt nur den Algorithmus.

## Was du mit den Daten anfängst

- **Keyword steigt** → was hast du in den letzten Wochen geändert? Notiere es, du kannst es auf anderen Seiten wiederholen.
- **Keyword fällt** → was hat sich geändert? Wettbewerber-Recherche: hat einer gerade einen neuen Artikel veröffentlicht?
`,
    relatedSlugs: ["was-sind-keywords", "longtail-keywords"],
  },
  {
    slug: "suchintention",
    title: "Suchintention verstehen",
    category: "Keywords",
    readingTime: 3,
    summary:
      "Hinter jeder Suchanfrage steht eine Absicht. Wer sie versteht, schreibt automatisch besseren Content.",
    body: `
## Was Suchintention ist

Hinter jeder Suchanfrage steht eine Absicht des Nutzers — was er gerade erreichen möchte. Wenn dein Content nicht zur Absicht passt, wirst du nicht ranken — egal wie schön deine Seite aussieht.

## Die vier klassischen Intentionen

### 1. Informational („möchte etwas wissen")

Suchanfragen wie „wie funktioniert ldap" oder „warum riecht leder neu". Antwort: Ratgeber-Artikel, Erklär-Inhalte.

### 2. Navigational („möchte zu einer bestimmten Seite")

„facebook login", „climbr.io". Antwort: die Marken-/Domain-eigene Seite. Wenig SEO-Spielraum.

### 3. Commercial Investigation („vergleicht Optionen")

„bester lederrucksack damen", „rucksack vergleich 2026". Antwort: Vergleichs-Artikel, Top-Listen, Reviews.

### 4. Transactional („möchte kaufen / handeln")

„lederrucksack damen kaufen", „kaffeemaschine bestellen". Antwort: Produktseite oder Kategorie.

## Wie du die Intention erkennst

Gib das Keyword in Google ein. Was du dort siehst, **ist** die Intention — Google hat sie schon ausgewertet:

- Siehst du oben **Produkt-Karussells** und **Shopping-Anzeigen** → transactional.
- Siehst du **Wikipedia und Ratgeber-Seiten** → informational.
- Siehst du **„Top 10"-Artikel** → commercial investigation.

## Praktische Konsequenz

Wenn du mit deiner Produktseite für ein Keyword ranken willst bei dem Google nur Ratgeber zeigt, hast du verloren — auch wenn du technisch alles richtig machst. Entweder du erstellst zusätzlich einen Ratgeber, oder du suchst ein anderes Keyword.

## Suchintention im Funnel

| Stufe          | Intention                  | Inhalt-Typ                              |
|----------------|----------------------------|------------------------------------------|
| Awareness      | informational              | Blog: „Was sind die Vorteile von Leder?" |
| Consideration  | commercial investigation   | Vergleich: „Die 5 besten Lederrucksäcke" |
| Decision       | transactional              | Produktseite                             |

Eine gute SEO-Strategie deckt alle drei Stufen ab — Awareness bringt Besucher in dein Universum, Transactional macht den Umsatz.
`,
    relatedSlugs: ["keyword-recherche", "longtail-keywords"],
  },

  // ---------- Lokales SEO ----------
  {
    slug: "lokales-seo-grundlagen",
    title: "Lokales SEO für lokale Businesses",
    category: "Lokales SEO",
    readingTime: 3,
    summary:
      "Wenn deine Kunden bei dir vor Ort kaufen oder du regional Dienstleistungen anbietest, ist lokales SEO der wichtigste Hebel.",
    body: `
## Worum es geht

Lokales SEO sorgt dafür, dass du gefunden wirst, wenn jemand eine Suche mit lokalem Bezug eingibt:

- „lederwaren münchen"
- „friseur in meiner nähe"
- „yoga studio köln-südstadt"

Google zeigt für solche Anfragen eine **lokale Box** (oft mit Karte) — die sogenannten **„Local Pack"**-Ergebnisse. Da reinzukommen ist Gold wert.

## Was Google für lokale Rankings prüft

1. **Nähe:** wie weit ist dein Geschäft vom Suchenden entfernt?
2. **Relevanz:** wie gut passt dein Angebot zur Suche?
3. **Prominenz:** wie bekannt und gut bewertet ist dein Geschäft?

## Die wichtigsten Hebel

### Google Business Profil

Das **Wichtigste überhaupt**. Ein Eintrag mit aktueller Adresse, Telefonnummer, Öffnungszeiten und Fotos. Mehr dazu im nächsten Artikel.

### NAP-Konsistenz

NAP = Name, Address, Phone. Diese drei Angaben sollten auf **allen** Online-Verzeichnissen identisch sein (Google Business Profil, Yelp, Gelbe Seiten, Facebook, deine eigene Seite). Sonst zweifelt Google an deiner Existenz.

### Lokale Keywords auf deiner Webseite

Baue deinen Standort gezielt in:

- Title-Tags („Lederwaren in München — Müller GmbH")
- H1-Überschriften
- Footer (mit voller Adresse)
- Im Texten der wichtigsten Seiten

### Bewertungen sammeln

Echte Google-Bewertungen sind ein starker Faktor. Frag zufriedene Kunden aktiv — eine E-Mail-Vorlage oder ein QR-Code auf dem Kassenbon wirkt Wunder.

### Lokale Backlinks

Erwähnungen oder Verlinkungen von **lokal verankerten Seiten** (lokale Presse, IHK, Vereine, Branchen-Verzeichnisse).

## Was du heute machen kannst

1. Google Business Profil anlegen oder Eintrag „beanspruchen" (claim).
2. Adresse + Telefon im Footer deiner Webseite einfügen.
3. Fünf zufriedene Kunden um eine Google-Bewertung bitten.
`,
    relatedSlugs: ["google-business-profil", "keyword-recherche"],
  },
  {
    slug: "google-business-profil",
    title: "Google Business Profil einrichten",
    category: "Lokales SEO",
    readingTime: 3,
    summary:
      "Das wichtigste kostenlose Tool für lokales SEO — in 30 Minuten eingerichtet, der Effekt ist sofort sichtbar.",
    body: `
## Was es ist

Das Google Business Profil (früher: „Google My Business") ist Googles eigenes Tool für Geschäfte mit physischem Standort. Es macht dich sichtbar in:

- Der lokalen 3er-Box bei Google-Suchen
- Google Maps
- Dem rechten Info-Panel bei Suchen nach deinem Geschäftsnamen

Komplett kostenlos.

## Einrichtung in 8 Schritten

### 1. Anmelden

Auf https://business.google.com mit einem Google-Konto einloggen. (Empfehlung: ein dediziertes Konto für dein Geschäft anlegen — falls du später Mitarbeiter Zugriff geben möchtest.)

### 2. Geschäft hinzufügen oder „beanspruchen"

Tippe deinen Geschäftsnamen ein. Wenn es schon einen automatisch erstellten Eintrag gibt, kannst du ihn beanspruchen.

### 3. Kategorie wählen

Wähle die spezifischste passende Kategorie („Lederwarengeschäft" statt „Geschäft"). Du kannst später Zusatz-Kategorien hinzufügen.

### 4. Adresse oder Servicegebiet

- Wenn Kunden zu dir kommen → vollständige Adresse.
- Wenn du zu Kunden fährst → Servicegebiet (z.B. „Großraum München").

### 5. Verifizierung

Google schickt dir eine Postkarte mit einem 5-stelligen Code an deine Adresse (1–2 Wochen). Den gibst du im Dashboard ein — fertig.

### 6. Profil ausfüllen

- **Öffnungszeiten** auf den Tag genau.
- **Telefonnummer.**
- **Webseiten-URL.**
- **Beschreibung** (max. 750 Zeichen).
- **Fotos:** Logo, Außenansicht, Innenräume, Produkte — mindestens 10 Fotos in guter Qualität.

### 7. Bewertungen einsammeln

Bitte deine ersten 5–10 Kunden um eine Google-Bewertung. Direkter Link über das Dashboard.

### 8. Regelmäßig aktualisieren

- Beiträge posten (wie ein Mini-Social-Media)
- Sonderöffnungszeiten an Feiertagen pflegen
- Auf Bewertungen antworten (auch auf negative — höflich, lösungsorientiert)

## Häufige Fehler

- **Mehrere Einträge** für dasselbe Geschäft — Google straft Duplikate ab.
- **Kategorien-Stuffing** (10 Kategorien auswählen) — wähle nur wirklich relevante.
- **Schwarz-Weiß-Fotos oder schlechte Handy-Bilder** — Investiere lieber 2 Stunden für ordentliche Fotos.
- **Keinen Eintrag haben** — der mit Abstand größte Fehler. Selbst Geschäfte ohne Webseite profitieren massiv von einem GBP.
`,
    relatedSlugs: ["lokales-seo-grundlagen"],
  },
];
