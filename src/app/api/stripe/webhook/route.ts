import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/config";
import { prisma } from "@/lib/db";
import { findPlanByPriceId } from "@/lib/billing/stripe-plans";
import type Stripe from "stripe";

type DbStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "UNPAID";
const STATUSES = new Set<DbStatus>(["TRIALING","ACTIVE","PAST_DUE","CANCELED","INCOMPLETE","INCOMPLETE_EXPIRED","UNPAID"]);

async function syncSubscription(subscription: Stripe.Subscription) {
  const plan = findPlanByPriceId(subscription.items.data[0]?.price.id);
  if (!plan) throw new Error("Unknown Stripe price ID; subscription not activated");
  const status = subscription.status.toUpperCase() as DbStatus;
  if (!STATUSES.has(status)) throw new Error("Unexpected Stripe subscription status");
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const practiceId = subscription.metadata.practiceId;
  if (!practiceId) throw new Error("Subscription has no practice reference");

  // Do not trust metadata alone: the customer must belong to the practice
  // through a registered OWNER membership.
  const owner = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId, memberships: { some: { practiceId, role: "OWNER", isActive: true } } },
    select: { id: true },
  });
  if (!owner) throw new Error("Stripe customer is not linked to this practice");

  const item = subscription.items.data[0];
  await prisma.subscription.upsert({
    where: { practiceId },
    create: {
      practiceId, stripeCustomerId: customerId, stripeSubscriptionId: subscription.id,
      stripePriceId: item.price.id, plan: plan.toUpperCase() as "STARTER" | "PRO" | "ENTERPRISE",
      status, currentPeriodStart: item.current_period_start ? new Date(item.current_period_start * 1000) : null,
      currentPeriodEnd: item.current_period_end ? new Date(item.current_period_end * 1000) : null,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    },
    update: {
      stripeCustomerId: customerId, stripeSubscriptionId: subscription.id,
      stripePriceId: item.price.id, plan: plan.toUpperCase() as "STARTER" | "PRO" | "ENTERPRISE",
      status, currentPeriodStart: item.current_period_start ? new Date(item.current_period_start * 1000) : null,
      currentPeriodEnd: item.current_period_end ? new Date(item.current_period_end * 1000) : null,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    },
  });
}

export async function POST(req: NextRequest) {
  // Preview only. Production must not accept billing webhooks until explicitly enabled.
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || !secret?.startsWith("whsec_")) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) return NextResponse.json({ received: true });
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      if (session.client_reference_id !== sub.metadata.practiceId) throw new Error("Practice mismatch");
      await syncSubscription(sub);
    } else if (event.type === "customer.subscription.created" ||
               event.type === "customer.subscription.updated" ||
               event.type === "customer.subscription.deleted") {
      // Always retrieve current state. Older delayed events cannot re-activate
      // a subscription after a newer cancellation event.
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(await stripe.subscriptions.retrieve(sub.id));
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const existing = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
        if (existing?.stripeSubscriptionId) {
          await syncSubscription(await stripe.subscriptions.retrieve(existing.stripeSubscriptionId));
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe.webhook] retryable failure", event.id, error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
