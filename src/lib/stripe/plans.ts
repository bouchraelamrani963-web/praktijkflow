import type { PricingPlan } from "@/types";

/**
 * NoShow Control 3-tier revenue-engine pricing.
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
 * Every plan MUST include `revenueFrame` — the product is sold as money back,
 * not as software. The line renders immediately under the price.
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
    revenueFrame: "Gemiddeld €150–€500 per maand teruggewonnen",
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
    revenueFrame: "Gemiddeld €500–€1.500 per maand teruggewonnen",
    revenueSubNote: "De meeste praktijken verdienen dit plan binnen 1 week terug",
    features: [
      "Volledige automatisering",
      "SMS/WhatsApp-aanbiedingen",
      "Dashboard inzichten",
      "Prioriteit in wachtrij",
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
    revenueFrame: "Gemiddeld €1.500–€4.000+ per maand teruggewonnen",
    features: [
      "Multi-chair optimalisatie",
      "Geavanceerde rapportage",
      "Snellere invulling",
      "Meerdere behandelaren/stoelen",
      "Slimme matching per behandelkamer",
    ],
  },
];
