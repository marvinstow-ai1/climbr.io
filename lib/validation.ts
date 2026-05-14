import { z } from "zod";

export const RunAuditInput = z.object({
  url: z.string().min(3).max(2048).refine((v) => {
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "must be a valid http(s) URL"),
  email: z.string().email().optional(),
  projectId: z.string().uuid().optional(),
  locale: z.enum(["en", "de"]).optional(),
});
export type RunAuditInput = z.infer<typeof RunAuditInput>;

export const TrackKeywordInput = z.object({
  projectId: z.string().uuid(),
  keyword: z.string().min(1).max(120),
});
export type TrackKeywordInput = z.infer<typeof TrackKeywordInput>;

// Domain — `example.com`, `sub.example.com`, etc. We strip scheme/path/www
// before validating, so https://www.example.com/foo also passes.
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

const Domain = z.string()
  .min(3)
  .max(253)
  .transform((v) => normalizeDomain(v))
  .refine((v) => DOMAIN_RE.test(v), "must be a valid domain (e.g. example.com)");

export const CreateProjectInput = z.object({
  domain: Domain,
  keywords: z
    .array(z.string().trim().min(1).max(120))
    .max(20) // Hard ceiling at API edge; per-plan check happens after auth.
    .optional()
    .default([]),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const MarkNotificationsSeenInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// ---------- Phase 2: DataForSEO-backed inputs ----------

export const KeywordResearchInput = z.object({
  keyword: z.string().trim().min(1).max(120),
  locale: z.enum(["en", "de"]).optional().default("de"),
});
export type KeywordResearchInput = z.infer<typeof KeywordResearchInput>;

const DomainOnly = z.string()
  .min(3)
  .max(253)
  .transform((v) => normalizeDomain(v))
  .refine((v) => DOMAIN_RE.test(v), "must be a valid domain (e.g. example.com)");

export const CompetitorAnalysisInput = z.object({
  domain: DomainOnly,
  compareDomain: DomainOnly.optional(),
  locale: z.enum(["en", "de"]).optional().default("de"),
});
export type CompetitorAnalysisInput = z.infer<typeof CompetitorAnalysisInput>;

export const NotificationSettingsInput = z.object({
  rankingThreshold: z.number().int().min(1).max(50).optional(),
  notificationFrequency: z.enum(["daily", "weekly", "off"]).optional(),
  emailNotifications: z.boolean().optional(),
  projectThresholds: z
    .array(
      z.object({
        projectId: z.string().uuid(),
        threshold: z.number().int().min(1).max(50).nullable(),
      }),
    )
    .max(50)
    .optional(),
});
export type NotificationSettingsInput = z.infer<typeof NotificationSettingsInput>;

export function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init?.headers ?? {}) },
  });
}

export function badRequest(message: string, details?: unknown): Response {
  return json({ error: { message, details } }, { status: 400 });
}

export function serverError(message: string): Response {
  return json({ error: { message } }, { status: 500 });
}

export function tooMany(message: string): Response {
  return json({ error: { message } }, { status: 429 });
}
