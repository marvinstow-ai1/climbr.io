import { describe, expect, it } from "vitest";
import {
  KeywordResearchInput,
  CompetitorAnalysisInput,
  NotificationSettingsInput,
} from "../lib/validation.js";

describe("KeywordResearchInput", () => {
  it("accepts a keyword + defaults locale to 'de'", () => {
    const out = KeywordResearchInput.parse({ keyword: "leather backpack" });
    expect(out.keyword).toBe("leather backpack");
    expect(out.locale).toBe("de");
  });
  it("rejects empty keywords", () => {
    expect(KeywordResearchInput.safeParse({ keyword: "" }).success).toBe(false);
    expect(KeywordResearchInput.safeParse({ keyword: "  " }).success).toBe(false);
  });
  it("rejects keywords > 120 chars", () => {
    expect(KeywordResearchInput.safeParse({ keyword: "x".repeat(121) }).success).toBe(false);
  });
});

describe("CompetitorAnalysisInput", () => {
  it("normalizes a https URL into a bare domain", () => {
    const out = CompetitorAnalysisInput.parse({ domain: "HTTPS://WWW.Example.COM/path" });
    expect(out.domain).toBe("example.com");
  });
  it("rejects bogus domains", () => {
    expect(CompetitorAnalysisInput.safeParse({ domain: "not a domain" }).success).toBe(false);
  });
  it("accepts an optional compareDomain", () => {
    const out = CompetitorAnalysisInput.parse({
      domain: "a.com",
      compareDomain: "https://b.com",
    });
    expect(out.compareDomain).toBe("b.com");
  });
});

describe("NotificationSettingsInput", () => {
  it("accepts a partial body", () => {
    const out = NotificationSettingsInput.parse({ rankingThreshold: 5 });
    expect(out.rankingThreshold).toBe(5);
    expect(out.notificationFrequency).toBeUndefined();
  });
  it("rejects threshold out of range", () => {
    expect(NotificationSettingsInput.safeParse({ rankingThreshold: 0 }).success).toBe(false);
    expect(NotificationSettingsInput.safeParse({ rankingThreshold: 51 }).success).toBe(false);
  });
  it("accepts null per-project threshold (= use global default)", () => {
    const out = NotificationSettingsInput.parse({
      projectThresholds: [
        { projectId: "00000000-0000-0000-0000-000000000001", threshold: null },
      ],
    });
    expect(out.projectThresholds?.[0]?.threshold).toBeNull();
  });
});
