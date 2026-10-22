import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/config";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { configuredStripePriceId, isBillingPlanId, STRIPE_PLANS } from "@/lib/billing/stripe-plans";
import { getSubscriptionForPractice, isActiveSubscription } from "@/lib/billing/subscription";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.practiceId || user.role !== "OWNER") {
      return NextResponse.json({ error: "Alleen de praktijkeigenaar kan een abonnement afsluiten." }, { status: 403 });
    }
    // Deliberately fail closed until the separate NoShow Control test Stripe
    // account and prices have been connected. Never take live payments here.
    if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
      return NextResponse.json({ error: "Testbetalingen zijn nog niet geconfigureerd." }, { status: 503 });
    }
    const input = await req.json().catch(() => null);
    if (!input || !isBillingPlanId(input.plan)) {
      return NextResponse.json({ error: "Ongeldig abonnement." }, { status: 400 });
    }
    const plan = input.plan;
    const configuredPriceId = configuredStripePriceId(plan);
    if (!configuredPriceId) {
      return NextResponse.json({ error: "De Stripe-testprijs voor dit abonnement ontbreekt." }, { status: 503 });
    }
    const current = await getSubscriptionForPractice(user.practiceId);
    if (isActiveSubscription(current) || current?.status === "PAST_DUE") {
      return NextResponse.json({ error: "Er bestaat al een abonnement. Gebruik abonnementbeheer." }, { status: 409 });
    }

    // Verify the connected Stripe Price before any redirect: pricing, tax,
    // currency and frequency must match the displayed 21%-VAT-inclusive price.
    const price = await stripe.prices.retrieve(configuredPriceId);
    if (!price.active || price.currency !== "eur" || price.unit_amount !== STRIPE_PLANS[plan].amount ||
        price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 ||
        price.tax_behavior !== "inclusive") {
      return NextResponse.json({ error: "De Stripe-testprijs komt niet overeen met de gepubliceerde prijs inclusief btw." }, { status: 503 });
    }

    const owner = await prisma.user.findUnique({ where: { id: user.uid } });
    if (!owner) return NextResponse.json({ error: "Account niet gevonden." }, { status: 404 });
    let customerId = current?.stripeCustomerId ?? owner.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.practiceName ?? undefined,
        metadata: { practiceId: user.practiceId, ownerId: user.uid },
      }, { idempotencyKey: `noshow-test-customer-${user.practiceId}` });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.uid }, data: { stripeCustomerId: customerId } });
    }

    // Origin comes from the configured Preview host, never the request Host.
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin || !origin.startsWith("https://") || origin.includes("noshowcontrol.nl")) {
      return NextResponse.json({ error: "Veilige Preview-URL ontbreekt." }, { status: 503 });
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: configuredPriceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=canceled`,
      client_reference_id: user.practiceId,
      metadata: { practiceId: user.practiceId, ownerId: user.uid, plan },
      subscription_data: { metadata: { practiceId: user.practiceId, ownerId: user.uid, plan } },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe.checkout] failed", error);
    return NextResponse.json({ error: "Testbetaling kon niet worden gestart." }, { status: 500 });
  }
}
