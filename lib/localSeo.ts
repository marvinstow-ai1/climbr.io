// Local-SEO playbook for DACH small businesses. The list below is the
// canonical action lane the user works through — it's intentionally short,
// concrete, and avoids agency jargon.

export interface LocalChecklistItem {
  key: string;
  title: string;
  why: string;
  action: string;
  category: "location" | "gbp" | "keywords" | "trust";
}

export const LOCAL_CHECKLIST: LocalChecklistItem[] = [
  {
    key: "location-page",
    title: "Standortseite je Filiale erstellen",
    why: "Für jeden Standort eine eigene Seite mit Adresse, Öffnungszeiten und Anfahrt gibt Google klare lokale Signale.",
    action: "Lege pro Standort eine Unterseite an (z.B. /standorte/berlin) mit Name, Adresse, Telefon, Öffnungszeiten und Karte.",
    category: "location",
  },
  {
    key: "gbp-claim",
    title: "Google-Unternehmensprofil beanspruchen & vollständig ausfüllen",
    why: "Ein vollständig gepflegtes GBP-Profil ist der wichtigste Hebel im Local Pack.",
    action: "Logge dich bei Google Business Profile ein, prüfe Adresse, Kategorie, Telefon, Website und lade aktuelle Fotos hoch.",
    category: "gbp",
  },
  {
    key: "gbp-posts",
    title: "Monatlich einen GBP-Beitrag veröffentlichen",
    why: "Aktivität signalisiert Google, dass das Profil gepflegt wird, und erscheint direkt in der Suche.",
    action: "Erstelle einen kurzen Beitrag (Angebot, Neuigkeit oder Veranstaltung) mit Bild und CTA.",
    category: "gbp",
  },
  {
    key: "city-service",
    title: "Service-+-Stadt-Keywords identifizieren",
    why: "Lokale Suchanfragen folgen oft dem Muster „Dienstleistung + Stadt“ (z.B. „Friseur München“).",
    action: "Liste deine 3-5 Hauptleistungen × deine wichtigsten Städte/Stadtteile und plane je eine Landingpage.",
    category: "keywords",
  },
  {
    key: "reviews-prompt",
    title: "Bestandskunden um eine Google-Bewertung bitten",
    why: "Aktuelle, positive Bewertungen sind ein starker Ranking-Faktor im Local Pack.",
    action: "Schicke 10 zufriedenen Kund:innen einen direkten Link zur Bewertung (über das Google-Profil).",
    category: "trust",
  },
  {
    key: "nap-consistent",
    title: "NAP-Daten in allen Verzeichnissen prüfen",
    why: "Inkonsistente Adressdaten verwirren Google und schwächen das Vertrauen.",
    action: "Prüfe Name, Adresse, Telefon auf Website, GBP, Branchenverzeichnissen, Social Media – alles identisch.",
    category: "trust",
  },
  {
    key: "local-schema",
    title: "Strukturierte Daten (LocalBusiness) ergänzen",
    why: "Schema.org-Markup hilft Google, Geschäftsdetails korrekt zu interpretieren.",
    action: "Füge auf der Startseite und jeder Standortseite ein LocalBusiness-JSON-LD-Snippet hinzu.",
    category: "location",
  },
  {
    key: "review-response",
    title: "Auf alle Bewertungen antworten",
    why: "Reagieren – auch auf negative Bewertungen – signalisiert Sorgfalt und stärkt Vertrauen.",
    action: "Plane 15 Minuten pro Woche, um alle neuen Bewertungen kurz, persönlich und sachlich zu beantworten.",
    category: "trust",
  },
];
