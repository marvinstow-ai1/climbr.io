/**
 * Unit tests for the cookie-consent storage logic.
 *
 * The CookieBanner component itself (showing / hiding, button clicks) is
 * better verified by the Playwright smoke test — here we just lock in
 * the storage contract.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

class MemoryStorage implements Storage {
  private s = new Map<string, string>();
  get length() { return this.s.size; }
  clear() { this.s.clear(); }
  getItem(k: string) { return this.s.has(k) ? this.s.get(k)! : null; }
  key(i: number) { return [...this.s.keys()][i] ?? null; }
  removeItem(k: string) { this.s.delete(k); }
  setItem(k: string, v: string) { this.s.set(k, v); }
}

// We need both `window.localStorage` AND `window.addEventListener` /
// `dispatchEvent` for reopenCookieBanner(). EventTarget covers the events.
function setupWindow() {
  const target = new EventTarget();
  (globalThis as unknown as { window: unknown }).window = Object.assign(target, {
    localStorage: new MemoryStorage(),
  });
}

beforeEach(setupWindow);
afterEach(() => { delete (globalThis as unknown as { window?: unknown }).window; });

describe("cookie consent", () => {
  it("starts out without a stored decision", async () => {
    const mod = await import("../frontend/src/components/cookie/consent.js");
    expect(window.localStorage.getItem("climbr_cookie_consent")).toBeNull();
    expect(typeof mod.reopenCookieBanner).toBe("function");
  });

  it("reopenCookieBanner() clears the stored decision and fires the event", async () => {
    const { reopenCookieBanner } = await import("../frontend/src/components/cookie/consent.js");
    window.localStorage.setItem("climbr_cookie_consent", "accepted");

    let fired = false;
    window.addEventListener("climbr:reopen-cookie-banner", () => { fired = true; });
    reopenCookieBanner();

    expect(window.localStorage.getItem("climbr_cookie_consent")).toBeNull();
    expect(fired).toBe(true);
  });

  it("reopenCookieBanner() is a no-op without window (SSR)", async () => {
    const { reopenCookieBanner } = await import("../frontend/src/components/cookie/consent.js");
    delete (globalThis as unknown as { window?: unknown }).window;
    expect(() => reopenCookieBanner()).not.toThrow();
  });
});
