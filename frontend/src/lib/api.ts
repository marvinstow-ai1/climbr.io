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
