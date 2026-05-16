/**
 * Climbr Onboarding-Tour (Shepherd.js v14).
 *
 * Wird einmalig nach dem ersten Login automatisch gestartet (siehe
 * `AppShell.tsx`). Status wird in `localStorage` unter
 * `climbr_onboarding_completed` gespeichert. Über die Einstellungen kann der
 * Nutzer das Tutorial jederzeit neu starten.
 *
 * Steps wurden aus der Code-Analyse abgeleitet:
 *  1. Welcome — zentriertes Modal als Einstieg
 *  2. Hauptnavigation — TopNav (`nav[aria-label="Hauptnavigation"]`)
 *  3. Erste Aktion — "Neues Projekt" Button im Dashboard-Header
 *  4. SEO-Workflow — der Monatsplan-CTA als zentrales Feature
 *  5. Konto-Menü — Profil/Settings + Hinweis auf "Tutorial neu starten"
 */

import type { Tour, Step, StepOptions } from "shepherd.js";

export const ONBOARDING_KEY = "climbr_onboarding_completed";

let activeTour: Tour | null = null;

export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch {
    // Privater Modus / Storage gesperrt — Tutorial dann pro Session zeigen.
    return false;
  }
}

export function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    /* ignore */
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Startet die Tour. Lädt Shepherd dynamisch, damit das Onboarding nicht im
 * initialen JS-Bundle landet. Sicher gegen Mehrfach-Aufrufe.
 */
export async function startOnboarding(): Promise<void> {
  if (activeTour) return;
  if (typeof window === "undefined") return;

  const { default: ShepherdMod } = await import("shepherd.js");
  // Shepherd liefert sein CSS-Reset mit — wir laden es NICHT, sondern nutzen
  // unser eigenes Styling in `styles/onboarding.css`. Dadurch bleibt das
  // Look-and-Feel konsistent mit dem Rest der App.

  const tour = new ShepherdMod.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      classes: "climbr-shepherd",
      scrollTo: { behavior: "smooth", block: "center" },
      cancelIcon: { enabled: true, label: "Tutorial schließen" },
      arrow: true,
      modalOverlayOpeningPadding: 6,
      modalOverlayOpeningRadius: 10,
      // a11y: jeder Step erhält Dialog-Semantik. Shepherd setzt
      // role="dialog" + aria-modal selbst; aria-live ergänzen wir für
      // Screenreader-Updates bei "Weiter".
      when: {
        show() {
          const el = this.getElement();
          if (!el) return;
          el.setAttribute("aria-live", "polite");
          const stepId = this.options?.id ?? "step";
          el.setAttribute("aria-label", `Tutorial — ${stepId}`);
          injectProgress(el, tour);
        },
      },
    },
    exitOnEsc: true,
    keyboardNavigation: true,
  });

  const steps = buildSteps(tour);
  steps.forEach((s) => tour.addStep(s));

  const finish = () => {
    markOnboardingCompleted();
    activeTour = null;
  };
  tour.on("complete", finish);
  tour.on("cancel", finish);

  activeTour = tour;
  tour.start();
}

/** Bricht eine laufende Tour ab (z.B. bei Logout). */
export function stopOnboarding(): void {
  if (activeTour) {
    activeTour.cancel();
    activeTour = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Steps
// ─────────────────────────────────────────────────────────────────────────────

function buildSteps(tour: Tour): StepOptions[] {
  const next = {
    text: "Weiter",
    classes: "shepherd-button-primary",
    action: () => tour.next(),
  };
  const skip = {
    text: "Überspringen",
    classes: "shepherd-button-secondary",
    action: () => tour.cancel(),
  };
  const back = {
    text: "Zurück",
    classes: "shepherd-button-secondary",
    action: () => tour.back(),
  };
  const finish = {
    text: "Los geht's",
    classes: "shepherd-button-primary",
    action: () => tour.complete(),
  };

  return [
    {
      id: "welcome",
      title: "Willkommen bei Climbr 👋",
      text:
        "Hier ist dein SEO-Cockpit. In 5 kurzen Schritten zeigen wir dir, " +
        "was du sehen kannst und was du als erstes tun solltest.",
      buttons: [skip, next],
    },
    {
      id: "navigation",
      title: "Hauptnavigation",
      text:
        "Über die obere Leiste erreichst du Dashboard, SEO-Workflow, Wiki " +
        "und Einstellungen.",
      attachTo: {
        element: 'nav[aria-label="Hauptnavigation"]',
        on: "bottom",
      },
      buttons: [back, next],
    },
    {
      id: "first-action",
      title: "Leg dein erstes Projekt an",
      text:
        'Klick auf „Neues Projekt“, gib deine Domain ein und wir starten ein ' +
        "30-Sekunden-Audit für dich.",
      attachTo: {
        // Bevorzugt der Header-Button. Fällt zurück auf die Sidebar bzw. den
        // Empty-State-CTA, je nachdem was im DOM ist.
        element: () =>
          document.querySelector<HTMLElement>('[data-testid="header-new-project"]') ??
          document.querySelector<HTMLElement>('[data-testid="sidebar-new-project"]') ??
          document.querySelector<HTMLElement>('[data-testid="empty-dashboard"] a'),
        on: "bottom",
      },
      buttons: [back, next],
    },
    {
      id: "seo-workflow",
      title: "Der geführte Monatsplan",
      text:
        "Im SEO-Workflow zeigen wir dir jeden Monat, welche Aufgaben am " +
        "meisten Sichtbarkeit bringen.",
      attachTo: {
        element: () =>
          document.querySelector<HTMLElement>('[data-testid="seo-workflow-cta"]') ??
          document.querySelector<HTMLElement>('a[href="/seo/workflow"]'),
        on: "bottom",
      },
      buttons: [back, next],
    },
    {
      id: "account",
      title: "Du bist startklar! 🚀",
      text:
        "Im Konto-Menü findest du deine Einstellungen — dort kannst du dieses " +
        "Tutorial auch jederzeit neu starten.",
      attachTo: {
        element: '[data-testid="account-menu-button"]',
        on: "bottom-end",
      },
      buttons: [back, finish],
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Fortschrittsbalken
// ─────────────────────────────────────────────────────────────────────────────

function injectProgress(el: HTMLElement, tour: Tour): void {
  const header = el.querySelector(".shepherd-header");
  if (!header) return;

  // Vorhandenen Balken entfernen (falls Step neu gerendert wurde).
  el.querySelector(".climbr-shepherd-progress")?.remove();

  const total = tour.steps.length;
  const current = tour.steps.indexOf(tour.getCurrentStep() as Step) + 1;
  if (total === 0 || current === 0) return;
  const pct = Math.round((current / total) * 100);

  const wrap = document.createElement("div");
  wrap.className = "climbr-shepherd-progress";
  wrap.innerHTML = `
    <div class="climbr-shepherd-progress__label">Schritt ${current} von ${total}</div>
    <div class="climbr-shepherd-progress__track" aria-hidden="true">
      <div class="climbr-shepherd-progress__bar" style="width:${pct}%"></div>
    </div>
  `;
  header.insertAdjacentElement("beforebegin", wrap);
}
