import Stripe from "stripe";
import { loadStripe, type Stripe as StripeClient } from "@stripe/stripe-js";

// Server-side Stripe instance (lazy to avoid build-time errors)
let _stripe: Stripe | null = null;

export function getServerStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-03-31.basil",
      typescript: true,
    });
  }
  return _stripe;
}

// Keep `stripe` as a getter for easy import
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getServerStripe() as never)[prop];
  },
});

// Client-side Stripe instance (singleton)
let stripePromise: Promise<StripeClient | null>;

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}
