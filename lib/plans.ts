// Plan-aware limit table. Keep this in sync with the marketing copy on
// frontend/src/pages/Pricing.tsx.

export type Plan = "free" | "starter" | "pro";

export interface PlanLimits {
  /** Max tracked keywords per project. */
  keywords: number;
  /** Max audits a user may run per calendar month. */
  auditsPerMonth: number;
  /** Max keyword-research lookups per calendar month. */
  keywordResearchPerMonth: number;
  /** Max competitor analyses per calendar month. */
  competitorAnalysesPerMonth: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:    { keywords: 5,   auditsPerMonth: 3,    keywordResearchPerMonth: 10,   competitorAnalysesPerMonth: 3   },
  starter: { keywords: 25,  auditsPerMonth: 30,   keywordResearchPerMonth: 100,  competitorAnalysesPerMonth: 30  },
  pro:     { keywords: 100, auditsPerMonth: 1000, keywordResearchPerMonth: 2000, competitorAnalysesPerMonth: 500 },
};

const PLANS = ["free", "starter", "pro"] as const;

export function normalizePlan(input: unknown): Plan {
  return PLANS.includes(input as Plan) ? (input as Plan) : "free";
}

export function limitsFor(plan: unknown): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
}

// Standardized structured-error body for plan-limit responses. The frontend
// switches on `code` to render the right CTA.
export type PlanResource = "keywords" | "audits" | "keyword_research" | "competitor_analyses";

export interface PlanLimitErrorBody {
  error: {
    code: "PLAN_LIMIT_REACHED";
    message: string;
    limit: number;
    current: number;
    plan: Plan;
    resource: PlanResource;
  };
}

export function planLimitError(args: {
  resource: PlanResource;
  plan: unknown;
  current: number;
  limit: number;
}): PlanLimitErrorBody {
  const plan = normalizePlan(args.plan);
  const messages: Record<PlanResource, string> = {
    keywords:             `Your ${plan} plan tracks up to ${args.limit} keywords per project.`,
    audits:               `Your ${plan} plan allows up to ${args.limit} audits per month.`,
    keyword_research:     `Your ${plan} plan includes ${args.limit} keyword research lookups per month.`,
    competitor_analyses:  `Your ${plan} plan includes ${args.limit} competitor analyses per month.`,
  };
  const human = messages[args.resource];
  return {
    error: {
      code: "PLAN_LIMIT_REACHED",
      message: `${human} Upgrade to add more.`,
      limit: args.limit,
      current: args.current,
      plan,
      resource: args.resource,
    },
  };
}

/**
 * Counts rows in `table` for the current calendar month, scoped by user_id.
 * Used by per-month plan checks.
 */
export async function monthlyCount(
  db: { from: (t: string) => { select: (c: string, o: { head: true; count: "exact" }) => { eq: (k: string, v: string) => { gte: (k: string, v: string) => Promise<{ count: number | null }> } } } },
  table: string,
  userId: string,
): Promise<number> {
  const since = startOfMonthIso();
  const { count } = await db
    .from(table)
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", since);
  return count ?? 0;
}

export function startOfMonthIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
