/**
 * Tests for the German auth-error mapping introduced in Phase 4 Bereich 6.
 * The Login/Signup/Passwort-Reset components themselves are exercised by
 * the Playwright smoke test — here we lock in the message translation.
 */

import { describe, expect, it } from "vitest";
import { germanAuthError } from "../frontend/src/lib/authErrors.js";

describe("germanAuthError", () => {
  it("translates invalid-credentials messages", () => {
    expect(germanAuthError(new Error("Invalid login credentials"))).toMatch(/E-Mail oder Passwort falsch/);
    expect(germanAuthError("invalid credentials")).toMatch(/falsch/);
  });

  it("translates rate-limit messages", () => {
    expect(germanAuthError(new Error("Email rate limit exceeded"))).toMatch(/zu viele versuche/i);
  });

  it("translates already-registered messages", () => {
    expect(germanAuthError(new Error("User already registered"))).toMatch(/schon registriert/i);
  });

  it("translates weak-password messages", () => {
    expect(germanAuthError(new Error("Password is too short"))).toMatch(/zu schwach|mindestens 8/i);
  });

  it("translates expired-token messages", () => {
    expect(germanAuthError(new Error("Token has expired"))).toMatch(/abgelaufen/i);
  });

  it("translates network errors", () => {
    expect(germanAuthError(new Error("Failed to fetch"))).toMatch(/internetverbindung/i);
  });

  it("returns a generic German fallback for unknown errors", () => {
    expect(germanAuthError(new Error("Something weird"))).toMatch(/schiefgelaufen/i);
    expect(germanAuthError(null)).toMatch(/schiefgelaufen/i);
    expect(germanAuthError(undefined)).toMatch(/schiefgelaufen/i);
    expect(germanAuthError("")).toMatch(/schiefgelaufen/i);
  });

  it("never returns an English passthrough", () => {
    const out = germanAuthError(new Error("Internal server error"));
    expect(out).not.toMatch(/internal server error/i);
  });
});
