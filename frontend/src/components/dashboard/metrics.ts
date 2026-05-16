import type {
  DashboardAudit,
  DashboardProject,
  DashboardRanking,
  KeywordMovement,
} from "./types";

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

// --- Dashboard-specific aggregations -------------------------------------

export interface VisibilityPoint {
  /** ISO date string for the bucket (YYYY-MM-DD). */
  date: string;
  /** Short label for the X axis (e.g. "12.05."). */
  label: string;
  /** Sichtbarkeitsscore 0–100 (höher = bessere durchschnittliche Position). */
  score: number | null;
  /** Anzahl der zugrundeliegenden Ranking-Messungen. */
  samples: number;
}

/**
 * Aggregiert tägliche Sichtbarkeitswerte aus Ranking-Messungen.
 *
 * Der „Visibility Score" pro Tag ist `max(0, 100 - avg(position))` und damit
 * intuitiv: Top-1 → ~99, Top-10 → ~90, Position 50 → 50, > 100 → 0.
 * Tage ohne Daten werden mit `score = null` zurückgegeben, damit das Chart
 * Lücken sauber darstellen kann.
 */
export function computeVisibilityTrend(
  rankings: DashboardRanking[],
  windowDays = 14,
  now: Date = new Date(),
): VisibilityPoint[] {
  const days: VisibilityPoint[] = [];
  const dayMs = 24 * 60 * 60 * 1000;

  // Bucket "today" at UTC midnight so the window is deterministic.
  const todayKey = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const buckets = new Map<string, { sum: number; count: number }>();
  for (const r of rankings) {
    if (r.position == null) continue;
    const ts = new Date(r.recorded_at);
    if (Number.isNaN(ts.getTime())) continue;
    const key = ts.toISOString().slice(0, 10);
    const b = buckets.get(key) ?? { sum: 0, count: 0 };
    b.sum += r.position;
    b.count += 1;
    buckets.set(key, b);
  }

  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(todayKey.getTime() - i * dayMs);
    const key = d.toISOString().slice(0, 10);
    const b = buckets.get(key);
    const score = b ? Math.max(0, Math.min(100, 100 - b.sum / b.count)) : null;
    days.push({
      date: key,
      label: `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.`,
      score: score == null ? null : Math.round(score * 10) / 10,
      samples: b?.count ?? 0,
    });
  }
  return days;
}

export interface ScoreDistribution {
  good: number;
  ok: number;
  bad: number;
  unknown: number;
  total: number;
}

/**
 * Verteilung der Projekte auf Score-Buckets — basiert auf dem aktuellsten
 * abgeschlossenen Audit pro Projekt. Projekte ohne abgeschlossenen Audit
 * landen in „unknown".
 */
export function computeScoreDistribution(
  projects: DashboardProject[],
  audits: DashboardAudit[],
): ScoreDistribution {
  const latestByProject = new Map<string, DashboardAudit>();
  for (const a of audits) {
    if (a.status !== "complete" || a.project_id == null || typeof a.score !== "number") continue;
    const prev = latestByProject.get(a.project_id);
    if (!prev || new Date(a.created_at) > new Date(prev.created_at)) {
      latestByProject.set(a.project_id, a);
    }
  }
  const dist: ScoreDistribution = { good: 0, ok: 0, bad: 0, unknown: 0, total: projects.length };
  for (const p of projects) {
    const a = latestByProject.get(p.id);
    const bucket = scoreBucket(a?.score ?? null);
    dist[bucket]++;
  }
  return dist;
}

export interface RisingKeyword {
  projectId: string;
  keyword: string;
  current: number;
  previous: number;
  /** positiv = Verbesserung (Position kleiner geworden), negativ = Verschlechterung. */
  delta: number;
}

/**
 * Top-Keywords nach Bewegung im Fenster. Standard: aufsteigend nach `delta`
 * sortiert (größte Verbesserung zuerst). `direction = "down"` für die größten
 * Verschlechterungen.
 */
export function computeRisingKeywords(
  rankings: DashboardRanking[],
  options: {
    windowDays?: number;
    limit?: number;
    direction?: "up" | "down";
    now?: Date;
  } = {},
): RisingKeyword[] {
  const { windowDays = 7, limit = 5, direction = "up", now = new Date() } = options;
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const inWindow = rankings.filter((r) => new Date(r.recorded_at).getTime() >= cutoff);

  const byKeyword = new Map<string, DashboardRanking[]>();
  for (const r of inWindow) {
    const key = `${r.project_id}::${r.keyword}`;
    const list = byKeyword.get(key) ?? [];
    list.push(r);
    byKeyword.set(key, list);
  }

  const out: RisingKeyword[] = [];
  for (const [key, list] of byKeyword.entries()) {
    if (list.length < 2) continue;
    list.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    const first = list[0];
    const last = list[list.length - 1];
    if (!first || !last || first.position == null || last.position == null) continue;
    const [projectId, keyword] = key.split("::");
    if (!projectId || !keyword) continue;
    out.push({
      projectId,
      keyword,
      current: last.position,
      previous: first.position,
      delta: first.position - last.position,
    });
  }

  out.sort((a, b) => (direction === "up" ? b.delta - a.delta : a.delta - b.delta));
  return out.filter((k) => (direction === "up" ? k.delta > 0 : k.delta < 0)).slice(0, limit);
}

/**
 * Mittelwert der Scores der jeweils aktuellsten Audits je Projekt.
 * Liefert null, wenn kein Projekt einen abgeschlossenen Audit hat.
 */
export function computeAverageScore(
  projects: DashboardProject[],
  audits: DashboardAudit[],
): number | null {
  const latestByProject = new Map<string, DashboardAudit>();
  for (const a of audits) {
    if (a.status !== "complete" || a.project_id == null || typeof a.score !== "number") continue;
    const prev = latestByProject.get(a.project_id);
    if (!prev || new Date(a.created_at) > new Date(prev.created_at)) {
      latestByProject.set(a.project_id, a);
    }
  }
  const scores: number[] = [];
  for (const p of projects) {
    const a = latestByProject.get(p.id);
    if (a && typeof a.score === "number") scores.push(a.score);
  }
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((s, n) => s + n, 0) / scores.length);
}
