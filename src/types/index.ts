export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  plan: PlanType;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "trialing"
  | "unpaid"
  | "none";

export type PlanType = "free" | "starter" | "pro" | "enterprise";

export interface PricingPlan {
  id: PlanType;
  name: string;
  /** Short qualifier shown under the plan name (e.g. "Voor kleine praktijken"). */
  tagline: string;
  /** Legacy long description (kept for back-compat; not rendered on pricing page). */
  description: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  stripePriceId: string;
  features: string[];
  /**
   * Revenue-framing line — required on every plan. Rendered immediately under
   * the price so the plan is read as an investment, not a cost.
   */
  revenueFrame: string;
  /**
   * Optional payback/reinforcement sub-line rendered directly below the
   * revenue frame. Currently only set on the Growth (highlighted) plan.
   */
  revenueSubNote?: string;
  /**
   * Small disclaimer rendered under the revenue frame. Keeps the range
   * defensible ("afhankelijk van praktijkgrootte en no-show percentage").
   */
  revenueDisclaimer?: string;
  highlighted?: boolean;
}
