// Frontend client for the /api/seo/* endpoints.

export type IntegrationProvider = "gsc" | "dataforseo" | "openai";

export interface IntegrationStatus {
  provider: IntegrationProvider;
  status: "connected" | "disconnected" | "error";
  last_tested_at: string | null;
  last_error: string | null;
  meta?: Record<string, unknown>;
}

export interface Opportunity {
  id: string;
  type:
    | "high_impressions_low_ctr"
    | "striking_distance"
    | "declining_clicks"
    | "stagnant_impressions"
    | "missing_meta";
  page_url: string | null;
  query: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  position: number | null;
  priority: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  score: number;
  status: "open" | "taskified" | "dismissed";
  data: Record<string, unknown>;
  detected_at: string;
}

export interface SeoTask {
  id: string;
  opportunity_id: string | null;
  title: string;
  why: string | null;
  expected_impact: string | null;
  effort: "low" | "medium" | "high";
  suggested_action: string | null;
  status: "open" | "in_progress" | "done" | "ignored";
  lane: "connect" | "discover" | "optimize" | "publish" | "review" | "local";
  data: Record<string, unknown>;
  done_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentBriefRow {
  id: string;
  keyword: string;
  page_url: string | null;
  intent: string | null;
  brief: {
    intent: string;
    targetKeyword: string;
    secondaryKeywords: string[];
    pageStructure: { heading: string; type: "h2" | "h3"; bullets: string[] }[];
    titleSuggestions: string[];
    h1: string;
    faq: { q: string; a: string }[];
    internalLinks: string[];
  };
  model: string | null;
  created_at: string;
}

export interface WorkflowState {
  period: string;
  steps: { step: "connect" | "discover" | "optimize" | "publish" | "review"; status: "open" | "in_progress" | "done"; progress: number }[];
  counts: {
    opportunities: number;
    opportunitiesOpen: number;
    tasksOpen: number;
    tasksDone: number;
    tasksTotal: number;
  };
  latestReport: { id: string; period: string; summary: string | null; created_at: string } | null;
}

export interface ReportPayload {
  period: string;
  summary: string;
  metrics: {
    clicks: number | null;
    impressions: number | null;
    ctr: number | null;
    avgPosition: number | null;
    keywordImproved: number;
    keywordDeclined: number;
    tasksDone: number;
    tasksOpen: number;
    tasksTotal: number;
    completionRate: number;
    delta: { clicks: number | null; impressions: number | null } | null;
  };
  previous: Record<string, unknown> | null;
}

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  });
  let body: unknown = null;
  try { body = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const message = (body as { error?: { message?: string } } | null)?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

// ---------- integrations ----------

export function listIntegrations(token: string): Promise<{ integrations: IntegrationStatus[] }> {
  return call("/api/seo/integrations", token);
}

export function saveIntegration(token: string, provider: IntegrationProvider, credentials: string): Promise<{ ok: true }> {
  return call("/api/seo/integrations", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider, credentials }),
  });
}

export function deleteIntegration(token: string, provider: IntegrationProvider): Promise<{ ok: true }> {
  return call(`/api/seo/integrations?provider=${provider}`, token, { method: "DELETE" });
}

export function testIntegration(token: string, provider: IntegrationProvider): Promise<{ ok: boolean; message: string }> {
  return call("/api/seo/integrations/test", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider }),
  });
}

// ---------- opportunities ----------

export function listOpportunities(token: string, projectId: string): Promise<{ opportunities: Opportunity[] }> {
  return call(`/api/seo/opportunities?projectId=${projectId}`, token);
}

export function scanOpportunities(token: string, projectId: string): Promise<{ inserted: number; gsc: boolean }> {
  return call("/api/seo/opportunities", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
}

// ---------- tasks ----------

export function listTasks(token: string, projectId: string): Promise<{ tasks: SeoTask[] }> {
  return call(`/api/seo/tasks?projectId=${projectId}`, token);
}

export function createTaskFromOpportunity(token: string, opportunityId: string): Promise<{ id: string }> {
  return call("/api/seo/tasks", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ opportunityId }),
  });
}

export function createTaskManual(
  token: string,
  payload: { projectId: string; title: string; why?: string; suggested_action?: string; lane?: SeoTask["lane"]; effort?: SeoTask["effort"] },
): Promise<{ id: string }> {
  return call("/api/seo/tasks", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateTaskStatus(token: string, id: string, status: SeoTask["status"]): Promise<{ ok: true }> {
  return call(`/api/seo/tasks?id=${id}`, token, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function deleteTask(token: string, id: string): Promise<{ ok: true }> {
  return call(`/api/seo/tasks?id=${id}`, token, { method: "DELETE" });
}

// ---------- briefs ----------

export function listBriefs(token: string, projectId: string): Promise<{ briefs: ContentBriefRow[] }> {
  return call(`/api/seo/briefs?projectId=${projectId}`, token);
}

export function generateBriefApi(
  token: string,
  payload: { projectId: string; keyword: string; pageUrl?: string },
): Promise<{ brief: ContentBriefRow }> {
  return call("/api/seo/briefs", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---------- workflow ----------

export function getWorkflow(token: string, projectId: string): Promise<WorkflowState> {
  return call(`/api/seo/workflow?projectId=${projectId}`, token);
}

export function updateWorkflowStep(
  token: string,
  projectId: string,
  step: WorkflowState["steps"][number]["step"],
  status: WorkflowState["steps"][number]["status"],
): Promise<{ ok: true }> {
  return call(`/api/seo/workflow?projectId=${projectId}`, token, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ step, status }),
  });
}

// ---------- reports ----------

export function getReport(token: string, projectId: string): Promise<ReportPayload> {
  return call(`/api/seo/reports?projectId=${projectId}`, token);
}
