import { describe, expect, it } from "vitest";
import {
  PLAN_LIMITS,
  limitsFor,
  normalizePlan,
  planLimitError,
  startOfMonthIso,
} from "../lib/plans.js";

describe("plans", () => {
  it("normalizePlan defaults to 'free' for unknown values", () => {
    expect(normalizePlan(undefined)).toBe("free");
    expect(normalizePlan(null)).toBe("free");
    expect(normalizePlan("enterprise")).toBe("free");
    expect(normalizePlan("starter")).toBe("starter");
    expect(normalizePlan("pro")).toBe("pro");
  });

  it("limitsFor returns the right shape for every plan", () => {
    for (const plan of ["free", "starter", "pro"] as const) {
      const l = limitsFor(plan);
      expect(l).toMatchObject({
        keywords: expect.any(Number),
        auditsPerMonth: expect.any(Number),
        keywordResearchPerMonth: expect.any(Number),
        competitorAnalysesPerMonth: expect.any(Number),
      });
    }
  });

  it("limits ascend free < starter < pro", () => {
    const k: (keyof typeof PLAN_LIMITS.free)[] = [
      "keywords", "auditsPerMonth", "keywordResearchPerMonth", "competitorAnalysesPerMonth",
    ];
    for (const key of k) {
      expect(PLAN_LIMITS.free[key]).toBeLessThan(PLAN_LIMITS.starter[key]);
      expect(PLAN_LIMITS.starter[key]).toBeLessThan(PLAN_LIMITS.pro[key]);
    }
  });

  it("planLimitError tags the resource in code + message", () => {
    const err = planLimitError({ resource: "keyword_research", plan: "free", current: 10, limit: 10 });
    expect(err.error.code).toBe("PLAN_LIMIT_REACHED");
    expect(err.error.resource).toBe("keyword_research");
    expect(err.error.plan).toBe("free");
    expect(err.error.message).toMatch(/keyword research/i);
    expect(err.error.message).toMatch(/10/);
  });

  it("startOfMonthIso returns the UTC first-of-month at 00:00", () => {
    const iso = startOfMonthIso(new Date("2025-08-17T12:34:56Z"));
    expect(iso).toBe("2025-08-01T00:00:00.000Z");
  });
});
