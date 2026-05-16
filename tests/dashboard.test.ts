/**
 * Unit tests for dashboard metric helpers.
 *
 * These helpers are pure functions consumed by the AppShell/Dashboard
 * components introduced in Phase 4, Bereich 1. The components themselves
 * are exercised by the Playwright smoke test in `tests/smoke.spec.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  computeAverageScore,
  computeKeywordMovements,
  computeRisingKeywords,
  computeScoreDistribution,
  computeVisibilityTrend,
  pickLatestAudit,
  scoreBucket,
  scoreLabel,
} from "../frontend/src/components/dashboard/metrics.js";
import type {
  DashboardAudit,
  DashboardProject,
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

describe("computeVisibilityTrend", () => {
  const now = new Date("2026-05-15T12:00:00Z");

  it("returns one bucket per day in the requested window, oldest first", () => {
    const trend = computeVisibilityTrend([], 7, now);
    expect(trend).toHaveLength(7);
    expect(trend[0]!.date).toBe("2026-05-09");
    expect(trend[6]!.date).toBe("2026-05-15");
    for (const day of trend) expect(day.score).toBeNull();
  });

  it("averages positions per day and inverts to a 0-100 visibility score", () => {
    const rankings: DashboardRanking[] = [
      ranking({ position: 5,  recorded_at: "2026-05-15T08:00:00Z" }),
      ranking({ position: 15, recorded_at: "2026-05-15T20:00:00Z" }),
    ];
    const trend = computeVisibilityTrend(rankings, 3, now);
    const today = trend[trend.length - 1]!;
    expect(today.date).toBe("2026-05-15");
    expect(today.samples).toBe(2);
    // avg position = 10, visibility = 100 - 10 = 90
    expect(today.score).toBe(90);
  });

  it("ignores null positions", () => {
    const rankings: DashboardRanking[] = [
      ranking({ position: null, recorded_at: "2026-05-15T08:00:00Z" }),
    ];
    const trend = computeVisibilityTrend(rankings, 1, now);
    expect(trend[0]!.score).toBeNull();
  });
});

describe("computeScoreDistribution", () => {
  it("buckets projects by latest complete audit", () => {
    const projects: DashboardProject[] = [
      project({ id: "p1" }),
      project({ id: "p2" }),
      project({ id: "p3" }),
      project({ id: "p4" }), // no audit
    ];
    const audits: DashboardAudit[] = [
      audit({ project_id: "p1", score: 85, status: "complete", created_at: "2026-05-10T00:00:00Z" }),
      audit({ project_id: "p1", score: 30, status: "complete", created_at: "2026-05-01T00:00:00Z" }), // older -> ignored
      audit({ project_id: "p2", score: 55, status: "complete", created_at: "2026-05-10T00:00:00Z" }),
      audit({ project_id: "p3", score: 20, status: "complete", created_at: "2026-05-10T00:00:00Z" }),
      audit({ project_id: "p4", score: 80, status: "pending",  created_at: "2026-05-10T00:00:00Z" }), // non-complete -> unknown
    ];
    expect(computeScoreDistribution(projects, audits)).toEqual({
      good: 1, ok: 1, bad: 1, unknown: 1, total: 4,
    });
  });
});

describe("computeRisingKeywords", () => {
  const now = new Date("2026-05-15T12:00:00Z");

  it("returns biggest improvers sorted by delta desc", () => {
    const rankings: DashboardRanking[] = [
      ranking({ project_id: "p1", keyword: "a", position: 20, recorded_at: "2026-05-10T00:00:00Z" }),
      ranking({ project_id: "p1", keyword: "a", position: 5,  recorded_at: "2026-05-14T00:00:00Z" }), // +15
      ranking({ project_id: "p1", keyword: "b", position: 8,  recorded_at: "2026-05-10T00:00:00Z" }),
      ranking({ project_id: "p1", keyword: "b", position: 3,  recorded_at: "2026-05-14T00:00:00Z" }), // +5
      ranking({ project_id: "p1", keyword: "c", position: 5,  recorded_at: "2026-05-10T00:00:00Z" }),
      ranking({ project_id: "p1", keyword: "c", position: 9,  recorded_at: "2026-05-14T00:00:00Z" }), // -4 → excluded
    ];
    const out = computeRisingKeywords(rankings, { windowDays: 7, limit: 5, direction: "up", now });
    expect(out.map((k) => k.keyword)).toEqual(["a", "b"]);
    expect(out[0]).toMatchObject({ keyword: "a", current: 5, previous: 20, delta: 15 });
  });

  it("returns biggest losers when direction = 'down'", () => {
    const rankings: DashboardRanking[] = [
      ranking({ keyword: "a", position: 5,  recorded_at: "2026-05-10T00:00:00Z" }),
      ranking({ keyword: "a", position: 25, recorded_at: "2026-05-14T00:00:00Z" }),
    ];
    const out = computeRisingKeywords(rankings, { windowDays: 7, direction: "down", now });
    expect(out).toHaveLength(1);
    expect(out[0]!.delta).toBe(-20);
  });
});

describe("computeAverageScore", () => {
  it("returns null when no projects have a completed audit", () => {
    expect(computeAverageScore([project({ id: "p1" })], [])).toBeNull();
  });

  it("averages the latest score of each project (rounded to int)", () => {
    const projects: DashboardProject[] = [project({ id: "p1" }), project({ id: "p2" })];
    const audits: DashboardAudit[] = [
      audit({ project_id: "p1", score: 80, status: "complete", created_at: "2026-05-10T00:00:00Z" }),
      audit({ project_id: "p2", score: 60, status: "complete", created_at: "2026-05-10T00:00:00Z" }),
    ];
    expect(computeAverageScore(projects, audits)).toBe(70);
  });
});

function project(overrides: Partial<DashboardProject>): DashboardProject {
  return {
    id: "p1",
    domain: "example.com",
    gsc_connected: false,
    gsc_connected_at: null,
    created_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

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
