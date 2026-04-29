import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/config";
import { adminDb } from "@/lib/firebase/admin";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.firebaseUID;
        if (uid && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await adminDb.collection("users").doc(uid).update({
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            plan: determinePlan(subscription),
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const usersSnapshot = await adminDb
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          await userDoc.ref.update({
            subscriptionStatus: subscription.status,
            plan: subscription.status === "active" ? determinePlan(subscription) : "free",
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const usersSnapshot = await adminDb
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          await usersSnapshot.docs[0].ref.update({ subscriptionStatus: "past_due" });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

function determinePlan(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price?.id;
  const starterPriceId = process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID;
  const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
  const enterprisePriceId = process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID;

  if (priceId === starterPriceId) return "starter";
  if (priceId === proPriceId) return "pro";
  if (priceId === enterprisePriceId) return "enterprise";
  return "free";
}
