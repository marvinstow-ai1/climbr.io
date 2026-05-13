// Plan-aware limit table. Keep this in sync with the marketing copy on
// frontend/src/pages/Pricing.tsx.

export type Plan = "free" | "starter" | "pro";

export interface PlanLimits {
  /** Max tracked keywords per project. */
  keywords: number;
  /** Max audits a user may run per calendar month. */
  auditsPerMonth: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:    { keywords: 5,   auditsPerMonth: 3 },
  starter: { keywords: 25,  auditsPerMonth: 30 },
  pro:     { keywords: 100, auditsPerMonth: 1000 },
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
export interface PlanLimitErrorBody {
  error: {
    code: "PLAN_LIMIT_REACHED";
    message: string;
    limit: number;
    current: number;
    plan: Plan;
    resource: "keywords" | "audits";
  };
}

export function planLimitError(args: {
  resource: "keywords" | "audits";
  plan: unknown;
  current: number;
  limit: number;
}): PlanLimitErrorBody {
  const plan = normalizePlan(args.plan);
  const human = args.resource === "keywords"
    ? `Your ${plan} plan tracks up to ${args.limit} keywords per project.`
    : `Your ${plan} plan allows up to ${args.limit} audits per month.`;
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
