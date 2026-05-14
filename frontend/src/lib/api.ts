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
