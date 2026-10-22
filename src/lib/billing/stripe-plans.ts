/**
 * Stripe billing IDs are intentionally server-only. No account or price is
 * created here: these variables must refer to the NoShow Control TEST account.
 * Keep marketing amounts (gross prices, EUR cents) consistent with the
 * reviewed pricing page. Never trust a price ID from a client request.
 */
export const STRIPE_PLANS = {
  starter: { env: "STRIPE_STARTER_PRICE_ID", amount: 5900, label: "Starter", dbPlan: "STARTER" },
  pro: { env: "STRIPE_PRO_PRICE_ID", amount: 7900, label: "Pro", dbPlan: "PRO" },
  enterprise: { env: "STRIPE_ENTERPRISE_PRICE_ID", amount: 11900, label: "Growth", dbPlan: "ENTERPRISE" },
} as const;

export type BillingPlanId = keyof typeof STRIPE_PLANS;

export function isBillingPlanId(value: unknown): value is BillingPlanId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(STRIPE_PLANS, value);
}

export function configuredStripePriceId(plan: BillingPlanId): string | null {
  const priceId = process.env[STRIPE_PLANS[plan].env];
  return priceId && priceId.startsWith("price_") ? priceId : null;
}

export function isStripeTestReady(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") &&
    process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") &&
    (Object.keys(STRIPE_PLANS) as BillingPlanId[]).every((plan) => configuredStripePriceId(plan)),
  );
}

export function findPlanByPriceId(priceId: string | null | undefined): BillingPlanId | null {
  if (!priceId) return null;
  for (const plan of Object.keys(STRIPE_PLANS) as BillingPlanId[]) {
    if (configuredStripePriceId(plan) === priceId) return plan;
  }
  return null;
}
