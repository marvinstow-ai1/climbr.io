import type { DashboardAudit, DashboardRanking, KeywordMovement } from "./types";

/**
 * Compute the latest finished audit (status === "complete") across all
 * projects of the user. Returns null when none exists.
 */
export function pickLatestAudit(audits: DashboardAudit[]): DashboardAudit | null {
  const completed = audits.filter((a) => a.status === "complete" && typeof a.score === "number");
  if (completed.length === 0) return null;
  return completed.reduce((acc, cur) =>
    new Date(cur.created_at).getTime() > new Date(acc.created_at).getTime() ? cur : acc,
  );
}

/**
 * Count keywords that moved up (positive) or down (negative) in the last
 * `windowDays` days. A keyword "moved up" when its earliest position in
 * the window is higher than the latest (lower number = better Google rank).
 */
export function computeKeywordMovements(
  rankings: DashboardRanking[],
  windowDays = 7,
  now: Date = new Date(),
): KeywordMovement {
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const inWindow = rankings.filter((r) => new Date(r.recorded_at).getTime() >= cutoff);

  const byKeyword = new Map<string, DashboardRanking[]>();
  for (const r of inWindow) {
    const key = `${r.project_id}::${r.keyword}`;
    const list = byKeyword.get(key) ?? [];
    list.push(r);
    byKeyword.set(key, list);
  }

  let positive = 0;
  let negative = 0;
  let neutral = 0;

  for (const list of byKeyword.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    const first = list[0];
    const last = list[list.length - 1];
    if (!first || !last || first.position == null || last.position == null) continue;
    const delta = first.position - last.position; // positive = improved (rank number got smaller)
    if (delta > 0) positive++;
    else if (delta < 0) negative++;
    else neutral++;
  }

  return { positive, negative, neutral };
}

/**
 * Score → semantic bucket used for color coding (≥70 grün, 40–69 orange, <40 rot).
 */
export type ScoreBucket = "good" | "ok" | "bad" | "unknown";

export function scoreBucket(score: number | null | undefined): ScoreBucket {
  if (score == null) return "unknown";
  if (score >= 70) return "good";
  if (score >= 40) return "ok";
  return "bad";
}

export function scoreLabel(bucket: ScoreBucket): string {
  switch (bucket) {
    case "good":
      return "Gut — deine Seite ist solide aufgestellt.";
    case "ok":
      return "Ausbaufähig — es gibt wichtige Punkte zu verbessern.";
    case "bad":
      return "Kritisch — deine Seite hat ernsthafte SEO-Probleme.";
    case "unknown":
      return "Noch kein Audit vorhanden.";
  }
}
