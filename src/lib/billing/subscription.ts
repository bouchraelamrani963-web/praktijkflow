/**
 * Billing helpers — subscription lookup + status interpretation.
 *
 * Phase 2 scope: read-only access to the Subscription model. This file
 * deliberately does NOT touch Stripe, does NOT mutate billing state, and
 * does NOT enforce any gating. Phase 3 will wire the Stripe webhook to
 * populate Subscription rows; Phase 4 will add gating that consumes
 * `isActiveSubscription()`.
 *
 * The single source of truth is the `Subscription` Prisma model — one
 * row per practice, created when checkout completes. Absence of a row
 * means "no subscription yet" (handled identically to a CANCELED status
 * for downstream gating: nothing locked yet, just no positive grant).
 */

import type { Subscription } from "@/generated/prisma/client";
import { prisma, safeQuery } from "@/lib/db";

/**
 * Fetch the (single) Subscription row for a practice. Returns null when:
 *   - The practice has never started a subscription
 *   - DATABASE_URL is not set (safeQuery fallback)
 *   - The query fails for any other reason
 *
 * Wrapped in safeQuery so callers can call this from server components
 * during render without try/catching.
 */
export async function getSubscriptionForPractice(
  practiceId: string,
): Promise<Subscription | null> {
  return safeQuery<Subscription | null>(
    "billing.getSubscriptionForPractice",
    () => prisma.subscription.findUnique({ where: { practiceId } }),
    null,
  );
}

/**
 * "Active" for product-access purposes. Both TRIALING and ACTIVE grant
 * full access; everything else (PAST_DUE, CANCELED, INCOMPLETE,
 * INCOMPLETE_EXPIRED, UNPAID, or null subscription) does not.
 *
 * NOTE: this is not yet enforced anywhere — Phase 4 will wire it into
 * dashboard middleware. For Phase 2 it's just available for callers.
 */
export function isActiveSubscription(sub: Subscription | null): boolean {
  if (!sub) return false;
  return sub.status === "TRIALING" || sub.status === "ACTIVE";
}

/**
 * "Past due" — subscription was active but the latest invoice failed to
 * charge. Stripe gives a grace period before transitioning to UNPAID or
 * CANCELED. Phase 4 will use this to render a soft "update payment"
 * banner without locking the dashboard.
 */
export function isPastDue(sub: Subscription | null): boolean {
  return sub?.status === "PAST_DUE";
}

/**
 * Days remaining in the trial, rounded UP. Returns:
 *   - null  if the subscription is missing, not on trial, or has no
 *           trialEndsAt timestamp
 *   - 0     if the trial just expired (trialEndsAt is in the past)
 *   - n     positive integer of full or partial days remaining
 *
 * Used by Phase 4 banners ("Nog 5 dagen proefperiode") and by Phase 3
 * webhook handling to detect "trial_will_end" events.
 */
export function trialDaysRemaining(sub: Subscription | null): number | null {
  if (!sub || sub.status !== "TRIALING" || !sub.trialEndsAt) return null;
  const ms = sub.trialEndsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

/**
 * Convenience: subscription with derived display-ready fields. Useful for
 * dashboard cards without forcing every caller to import all helpers.
 */
export interface SubscriptionSummary {
  subscription: Subscription | null;
  active: boolean;
  pastDue: boolean;
  trialDaysLeft: number | null;
}

export async function getSubscriptionSummary(
  practiceId: string,
): Promise<SubscriptionSummary> {
  const subscription = await getSubscriptionForPractice(practiceId);
  return {
    subscription,
    active: isActiveSubscription(subscription),
    pastDue: isPastDue(subscription),
    trialDaysLeft: trialDaysRemaining(subscription),
  };
}
