/**
 * Unit tests for the learning-layer localStorage helpers.
 *
 * The component itself is exercised by the Playwright smoke test —
 * here we just verify the persistence layer that backs "schon mal
 * gesehen" tracking for ExplainerBox.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _clearLearningState,
  hasSeenExplainer,
  markExplainerSeen,
} from "../frontend/src/components/learning/storage.js";

// Provide a minimal localStorage shim for the Node-based vitest run.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  key(i: number) { return [...this.store.keys()][i] ?? null; }
  removeItem(k: string) { this.store.delete(k); }
  setItem(k: string, v: string) { this.store.set(k, v); }
}

beforeEach(() => {
  (globalThis as unknown as { window: { localStorage: Storage } }).window = {
    localStorage: new MemoryStorage(),
  };
});

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("learning storage", () => {
  it("returns false for unseen keys", () => {
    expect(hasSeenExplainer("seo-score")).toBe(false);
  });

  it("returns true after markExplainerSeen()", () => {
    markExplainerSeen("seo-score");
    expect(hasSeenExplainer("seo-score")).toBe(true);
  });

  it("scopes seen-state per key", () => {
    markExplainerSeen("seo-score");
    expect(hasSeenExplainer("meta-description")).toBe(false);
  });

  it("_clearLearningState removes all learning keys but leaves others alone", () => {
    markExplainerSeen("seo-score");
    markExplainerSeen("meta-description");
    window.localStorage.setItem("other-app-key", "keep-me");

    _clearLearningState();

    expect(hasSeenExplainer("seo-score")).toBe(false);
    expect(hasSeenExplainer("meta-description")).toBe(false);
    expect(window.localStorage.getItem("other-app-key")).toBe("keep-me");
  });

  it("is a no-op when window is undefined (SSR/Node)", () => {
    delete (globalThis as unknown as { window?: unknown }).window;
    expect(() => markExplainerSeen("seo-score")).not.toThrow();
    expect(hasSeenExplainer("seo-score")).toBe(false);
  });
});
