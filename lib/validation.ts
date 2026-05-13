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

export const MarkNotificationsSeenInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

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
