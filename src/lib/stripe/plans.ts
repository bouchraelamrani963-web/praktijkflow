import type { PricingPlan } from "@/types";

/**
 * NoShow Control 3-tier SaaS pricing.
 *
 * Internal IDs are kept aligned with the existing Stripe webhook mapping
 * (`starter` / `pro` / `enterprise`) so billing integrations and historical
 * subscription records continue to resolve correctly. The marketing names
 * (Starter / Pro / Growth) and prices are what the user sees.
 *
 * Mapping after the 2026-04 rebrand:
 *   - id: "starter"     → marketing name "Starter"  · €59  · klein
 *   - id: "pro"         → marketing name "Pro"      · €79  · groeiend (highlighted)
 *   - id: "enterprise"  → marketing name "Growth"   · €119 · meerstoels
 *
 * `revenueFrame` is retained for type compatibility but should not be rendered
 * as a hard claim on the public pricing page.
 */
export const plans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Voor kleine praktijken",
    description: "Voor kleine praktijken",
    price: 59,
    currency: "EUR",
    interval: "month",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "",
    revenueFrame: "Open plekken en wachtlijst overzichtelijk beheren",
    features: [
      "Basis wachtlijst",
      "Handmatig aanbod sturen",
      "Basis dashboard",
    ],
  },
  {
    id: "pro", // internal id retained for Stripe webhook compatibility
    name: "Pro",
    tagline: "Voor groeiende praktijken",
    description: "Voor groeiende praktijken",
    price: 79,
    currency: "EUR",
    interval: "month",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    revenueFrame: "Aanbiedingen en claim-links gestructureerd opvolgen",
    revenueSubNote: "Geschikt voor praktijken die de workflow dagelijks gebruiken",
    features: [
      "Volledige automatisering",
      "E-mailaanbiedingen met claim-link",
      "Dashboard inzichten",
      "Overzicht van aanbiedingen",
    ],
    highlighted: true,
  },
  {
    id: "enterprise", // internal id retained for Stripe webhook compatibility
    name: "Growth",
    tagline: "Voor meerstoelpraktijken",
    description: "Voor meerstoelpraktijken",
    price: 119,
    currency: "EUR",
    interval: "month",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID ?? "",
    revenueFrame: "Meer behandelaren en open plekken centraal beheren",
    features: [
      "Multi-chair optimalisatie",
      "Geavanceerde rapportage",
      "Snellere invulling",
      "Meerdere behandelaren/stoelen",
      "Slimme matching per behandelkamer",
    ],
  },
];
