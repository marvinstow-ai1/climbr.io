export interface AuditFix {
  priority: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  title: string;
  why: string;
  steps: string[];
  example?: string;
  estimatedMinutes: number;
}

export interface AuditPreview {
  auditId: string;
  status: "complete" | "pending" | "failed";
  score: number;
  preview: {
    summary: string;
    topFixes: AuditFix[];
  };
}

export interface FullAudit {
  id: string;
  url: string;
  status: string;
  score: number | null;
  raw_crawl_json: unknown;
  ai_report_json: {
    score: number;
    locale: "en" | "de";
    summary: string;
    topFixes: AuditFix[];
    quickWins: string[];
    furtherReading: { title: string; url: string }[];
    notes?: string[];
    model: string;
    generatedAt: string;
  } | null;
  created_at: string;
  capture_email: string | null;
  project_id: string | null;
}

export async function runAudit(payload: {
  url: string;
  email?: string;
  projectId?: string;
  locale?: "en" | "de";
}): Promise<AuditPreview> {
  const res = await fetch("/api/audit/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getAudit(id: string, opts: { email?: string; token?: string }): Promise<FullAudit> {
  const url = new URL(`/api/audit/${id}`, window.location.origin);
  if (opts.email) url.searchParams.set("email", opts.email);
  const res = await fetch(url.toString(), {
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ---------- structured errors ----------

export interface ApiError extends Error {
  status: number;
  code?: string;
  body?: unknown;
}

async function apiJson<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  let body: unknown = null;
  try { body = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const errBody = (body as { error?: { code?: string; message?: string } } | null)?.error;
    const err = new Error(errBody?.message ?? `HTTP ${res.status}`) as ApiError;
    err.status = res.status;
    if (errBody?.code) err.code = errBody.code;
    err.body = body;
    throw err;
  }
  return body as T;
}

// ---------- projects ----------

export interface Project {
  id: string;
  domain: string;
  gsc_connected: boolean;
  gsc_connected_at: string | null;
  created_at: string;
}

export interface KeywordRow {
  id: string;
  keyword: string;
  created_at?: string;
}

export async function createProject(
  token: string,
  payload: { domain: string; keywords?: string[] },
): Promise<{ project: Project; keywords: KeywordRow[] }> {
  return apiJson("/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function listProjects(token: string): Promise<{ projects: Project[] }> {
  return apiJson("/api/projects", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
}

// ---------- keywords ----------

export async function addKeyword(
  token: string,
  payload: { projectId: string; keyword: string },
): Promise<KeywordRow> {
  return apiJson("/api/rankings/track", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function deleteKeyword(token: string, id: string): Promise<void> {
  await apiJson(`/api/rankings/track?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
}

// ---------- notifications ----------

export interface Notification {
  id: string;
  project_id: string;
  keyword: string;
  old_position: number | null;
  new_position: number | null;
  seen: boolean;
  created_at: string;
}

export async function listNotifications(token: string): Promise<{ notifications: Notification[] }> {
  return apiJson("/api/notifications", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function markNotificationsSeen(token: string, ids: string[]): Promise<void> {
  await apiJson("/api/notifications", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ ids }),
  });
}

// ---------- keyword research ----------

export interface KeywordMetrics {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: number | null;
  keyword_difficulty: number | null;
}

export interface SerpResultItem {
  position: number;
  title: string;
  url: string;
  domain: string;
  snippet: string | null;
}

export interface KeywordResearchResponse {
  id: string;
  keyword: string;
  locale: "en" | "de";
  metrics: KeywordMetrics | null;
  serp: SerpResultItem[];
  related: KeywordMetrics[];
}

export interface KeywordResearchSummary {
  id: string;
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  keyword_difficulty: number | null;
  created_at: string;
}

export async function runKeywordResearch(
  token: string,
  payload: { keyword: string; locale?: "en" | "de" },
): Promise<KeywordResearchResponse> {
  return apiJson("/api/keywords/research", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function listKeywordResearch(token: string): Promise<{ items: KeywordResearchSummary[] }> {
  return apiJson("/api/keywords/research", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
}

// ---------- competitor analysis ----------

export interface DomainSnapshot {
  domain: string;
  overview: {
    domain: string;
    organic_keywords_count: number | null;
    organic_traffic: number | null;
    paid_traffic: number | null;
  };
  keywords: {
    keyword: string;
    position: number;
    search_volume: number | null;
    traffic: number | null;
    url: string | null;
  }[];
  competitors: { domain: string; intersections: number; organic_traffic: number | null }[];
  backlinks: { backlinks: number | null; referring_domains: number | null; rank: number | null };
}

export interface CompetitorAnalysisResponse {
  id: string;
  locale: "en" | "de";
  primary: DomainSnapshot;
  compare: DomainSnapshot | null;
}

export interface CompetitorAnalysisSummary {
  id: string;
  domain: string;
  compare_domain: string | null;
  organic_traffic: number | null;
  organic_keywords_count: number | null;
  backlinks_count: number | null;
  created_at: string;
}

export async function runCompetitorAnalysis(
  token: string,
  payload: { domain: string; compareDomain?: string; locale?: "en" | "de" },
): Promise<CompetitorAnalysisResponse> {
  return apiJson("/api/competitors/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function listCompetitorAnalysis(token: string): Promise<{ items: CompetitorAnalysisSummary[] }> {
  return apiJson("/api/competitors/analyze", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
}

// ---------- dashboard snapshot ----------

export interface DashboardSnapshot {
  project_id: string;
  organic_traffic: number | null;
  organic_keywords_count: number | null;
  traffic_trend: { date: string; traffic: number | null }[];
  top_gainers: { keyword: string; old_position: number | null; new_position: number | null }[];
  top_losers: { keyword: string; old_position: number | null; new_position: number | null }[];
  competitor_moves: { domain: string; change: number | null; traffic?: number | null }[];
  refreshed_at: string;
}

export async function getDashboardSnapshot(
  token: string,
  projectId: string,
  opts: { refresh?: boolean } = {},
): Promise<{ snapshot: DashboardSnapshot; cached: boolean }> {
  const path = `/api/dashboard/${projectId}${opts.refresh ? "?refresh=1" : ""}`;
  return apiJson(path, {
    method: opts.refresh ? "POST" : "GET",
    headers: { authorization: `Bearer ${token}` },
  });
}

// ---------- notification settings ----------

export interface NotificationSettings {
  email_notifications: boolean;
  ranking_threshold: number;
  notification_frequency: "daily" | "weekly" | "off";
}

export interface ProjectNotificationOverride {
  id: string;
  domain: string;
  notification_threshold: number | null;
}

export async function getNotificationSettings(token: string): Promise<{
  settings: NotificationSettings;
  projects: ProjectNotificationOverride[];
}> {
  return apiJson("/api/settings/notifications", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function updateNotificationSettings(
  token: string,
  payload: {
    rankingThreshold?: number;
    notificationFrequency?: "daily" | "weekly" | "off";
    emailNotifications?: boolean;
    projectThresholds?: { projectId: string; threshold: number | null }[];
  },
): Promise<void> {
  await apiJson("/api/settings/notifications", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

// ---------- audit run (authed variant) ----------

export async function runProjectAudit(
  token: string,
  payload: { url: string; projectId: string; locale?: "en" | "de" },
): Promise<AuditPreview> {
  return apiJson("/api/audit/run", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}
