/**
 * Cookie-consent storage helpers. Extracted from CookieBanner.tsx so the
 * unit tests can import them without pulling in JSX / React.
 *
 * SSR/Test-safe: every helper becomes a no-op when `window` is missing.
 */

export const STORAGE_KEY = "climbr_cookie_consent";
export const REOPEN_EVENT = "climbr:reopen-cookie-banner";

export type Consent = "accepted" | "rejected" | null;

export function readConsent(): Consent {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "rejected") return v;
    return null;
  } catch {
    return null;
  }
}

export function writeConsent(c: "accepted" | "rejected"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, c);
  } catch {
    // localStorage might be disabled
  }
}

/**
 * Triggert ein erneutes Anzeigen des Banners — wird vom Footer-Link
 * "Cookie-Einstellungen" gerufen.
 */
export function reopenCookieBanner(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(REOPEN_EVENT));
}
