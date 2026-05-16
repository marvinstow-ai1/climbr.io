/**
 * Unit tests for dashboard metric helpers.
 *
 * These helpers are pure functions consumed by the AppShell/Dashboard
 * components introduced in Phase 4, Bereich 1. The components themselves
 * are exercised by the Playwright smoke test in `tests/smoke.spec.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  computeKeywordMovements,
  pickLatestAudit,
  scoreBucket,
  scoreLabel,
} from "../frontend/src/components/dashboard/metrics.js";
import type {
  DashboardAudit,
  DashboardRanking,
} from "../frontend/src/components/dashboard/types.js";

describe("scoreBucket", () => {
  it("classifies scores into the three colour buckets", () => {
    expect(scoreBucket(95)).toBe("good");
    expect(scoreBucket(70)).toBe("good");
    expect(scoreBucket(69)).toBe("ok");
    expect(scoreBucket(40)).toBe("ok");
    expect(scoreBucket(39)).toBe("bad");
    expect(scoreBucket(0)).toBe("bad");
  });

  it("returns 'unknown' for null / undefined", () => {
    expect(scoreBucket(null)).toBe("unknown");
    expect(scoreBucket(undefined)).toBe("unknown");
  });

  it("produces a German label for every bucket", () => {
    expect(scoreLabel("good")).toMatch(/Gut/);
    expect(scoreLabel("ok")).toMatch(/Ausbaufähig/);
    expect(scoreLabel("bad")).toMatch(/Kritisch/);
    expect(scoreLabel("unknown")).toMatch(/kein Audit/);
  });
});

describe("pickLatestAudit", () => {
  it("returns null when no audits exist", () => {
    expect(pickLatestAudit([])).toBeNull();
  });

  it("ignores non-complete audits", () => {
    const audits: DashboardAudit[] = [
      audit({ id: "a1", status: "pending", score: null, created_at: "2026-05-10T00:00:00Z" }),
      audit({ id: "a2", status: "failed", score: null, created_at: "2026-05-11T00:00:00Z" }),
    ];
    expect(pickLatestAudit(audits)).toBeNull();
  });

  it("picks the most recent complete audit", () => {
    const audits: DashboardAudit[] = [
      audit({ id: "old", status: "complete", score: 50, created_at: "2026-05-01T00:00:00Z" }),
      audit({ id: "new", status: "complete", score: 80, created_at: "2026-05-12T00:00:00Z" }),
      audit({ id: "mid", status: "complete", score: 65, created_at: "2026-05-05T00:00:00Z" }),
      audit({ id: "newer-but-pending", status: "pending", score: null, created_at: "2026-05-14T00:00:00Z" }),
    ];
    expect(pickLatestAudit(audits)?.id).toBe("new");
  });
});

describe("computeKeywordMovements", () => {
  const now = new Date("2026-05-15T12:00:00Z");

  it("counts a keyword that improved over the window as positive", () => {
    const rankings: DashboardRanking[] = [
      ranking({ keyword: "shoes", position: 14, recorded_at: "2026-05-10T00:00:00Z" }),
      ranking({ keyword: "shoes", position: 11, recorded_at: "2026-05-12T00:00:00Z" }),
      ranking({ keyword: "shoes", position: 9,  recorded_at: "2026-05-14T00:00:00Z" }),
    ];
    expect(computeKeywordMovements(rankings, 7, now)).toEqual({ positive: 1, negative: 0, neutral: 0 });
  });

  it("counts a keyword that worsened over the window as negative", () => {
    const rankings: DashboardRanking[] = [
      ranking({ keyword: "shoes", position: 5, recorded_at: "2026-05-10T00:00:00Z" }),
      ranking({ keyword: "shoes", position: 9, recorded_at: "2026-05-14T00:00:00Z" }),
    ];
    expect(computeKeywordMovements(rankings, 7, now)).toEqual({ positive: 0, negative: 1, neutral: 0 });
  });

  it("groups by project_id + keyword so the same keyword in different projects counts twice", () => {
    const rankings: DashboardRanking[] = [
      ranking({ project_id: "p1", keyword: "shoes", position: 10, recorded_at: "2026-05-10T00:00:00Z" }),
      ranking({ project_id: "p1", keyword: "shoes", position: 4,  recorded_at: "2026-05-14T00:00:00Z" }),
      ranking({ project_id: "p2", keyword: "shoes", position: 7,  recorded_at: "2026-05-10T00:00:00Z" }),
      ranking({ project_id: "p2", keyword: "shoes", position: 12, recorded_at: "2026-05-14T00:00:00Z" }),
    ];
    expect(computeKeywordMovements(rankings, 7, now)).toEqual({ positive: 1, negative: 1, neutral: 0 });
  });

  it("ignores data points outside the window", () => {
    const rankings: DashboardRanking[] = [
      ranking({ keyword: "shoes", position: 20, recorded_at: "2026-04-01T00:00:00Z" }), // outside
      ranking({ keyword: "shoes", position: 5,  recorded_at: "2026-05-14T00:00:00Z" }),
    ];
    // Only one in-window data point → cannot determine movement.
    expect(computeKeywordMovements(rankings, 7, now)).toEqual({ positive: 0, negative: 0, neutral: 0 });
  });

  it("returns zeros for an empty input", () => {
    expect(computeKeywordMovements([], 7, now)).toEqual({ positive: 0, negative: 0, neutral: 0 });
  });

  it("ignores keywords with null positions", () => {
    const rankings: DashboardRanking[] = [
      ranking({ keyword: "shoes", position: null, recorded_at: "2026-05-10T00:00:00Z" }),
      ranking({ keyword: "shoes", position: 7,    recorded_at: "2026-05-14T00:00:00Z" }),
    ];
    expect(computeKeywordMovements(rankings, 7, now)).toEqual({ positive: 0, negative: 0, neutral: 0 });
  });
});

// --- factories --------------------------------------------------------------

function audit(overrides: Partial<DashboardAudit>): DashboardAudit {
  return {
    id: "audit-id",
    project_id: "p1",
    url: "https://example.com",
    score: 50,
    status: "complete",
    created_at: "2026-05-10T00:00:00Z",
    ...overrides,
  };
}

function ranking(overrides: Partial<DashboardRanking>): DashboardRanking {
  return {
    project_id: "p1",
    keyword: "shoes",
    position: 10,
    recorded_at: "2026-05-10T00:00:00Z",
    ...overrides,
  };
}
