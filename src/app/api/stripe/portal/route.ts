import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/config";
import { getCurrentUser } from "@/lib/auth/session";
import { getSubscriptionForPractice } from "@/lib/billing/subscription";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.practiceId || user.role !== "OWNER") {
      return NextResponse.json({ error: "Alleen de praktijkeigenaar kan abonnementen beheren." }, { status: 403 });
    }
    if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
      return NextResponse.json({ error: "Abonnementbeheer in Preview is nog niet geconfigureerd." }, { status: 503 });
    }
    const sub = await getSubscriptionForPractice(user.practiceId);
    const owner = await prisma.user.findUnique({ where: { id: user.uid }, select: { stripeCustomerId: true } });
    const customerId = sub?.stripeCustomerId ?? owner?.stripeCustomerId;
    if (!customerId) return NextResponse.json({ error: "Nog geen abonnement beschikbaar." }, { status: 404 });
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin || !origin.startsWith("https://") || origin.includes("noshowcontrol.nl")) {
      return NextResponse.json({ error: "Veilige Preview-URL ontbreekt." }, { status: 503 });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/abonnement`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe.portal] failed", error);
    return NextResponse.json({ error: "Abonnementbeheer kon niet worden geopend." }, { status: 500 });
  }
}
