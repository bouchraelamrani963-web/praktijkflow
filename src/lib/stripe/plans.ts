import type { PricingPlan } from "@/types";

/**
 * PraktijkFlow 3-tier revenue-engine pricing.
 *
 * Internal IDs are kept aligned with the existing Stripe webhook mapping
 * (`starter` / `pro` / `enterprise`) so billing integrations and historical
 * subscription records continue to resolve correctly. The marketing names
 * (Start / Growth / Pro) and prices are what the user sees.
 *
 * Every plan MUST include `revenueFrame` — the product is sold as money back,
 * not as software. The line renders immediately under the price.
 */
export const plans: PricingPlan[] = [
  {
    id: "starter",
    name: "Start",
    tagline: "Voor kleine praktijken",
    description: "Voor kleine praktijken",
    price: 49,
    currency: "EUR",
    interval: "month",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "",
    revenueFrame: "Gemiddeld €150–€400 per maand teruggewonnen",
    revenueDisclaimer: "Afhankelijk van praktijkgrootte en no-show percentage",
    features: [
      "Basis wachtlijst",
      "Automatische invulling",
      "Beperkt dashboard",
    ],
  },
  {
    id: "pro", // internal id retained for Stripe webhook compatibility
    name: "Growth",
    tagline: "Voor groeiende praktijken",
    description: "Voor groeiende praktijken",
    price: 79,
    currency: "EUR",
    interval: "month",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    revenueFrame: "Gemiddeld €300–€800 per maand teruggewonnen",
    revenueSubNote: "De meeste praktijken verdienen dit plan binnen 1 week terug",
    revenueDisclaimer: "Afhankelijk van praktijkgrootte en no-show percentage",
    features: [
      "Volledige automatisering",
      "Dashboard inzichten",
      "Prioriteit in wachtrij",
    ],
    highlighted: true,
  },
  {
    id: "enterprise", // internal id retained for Stripe webhook compatibility
    name: "Pro",
    tagline: "Voor meerstoelspraktijken",
    description: "Voor meerstoelspraktijken",
    price: 119,
    currency: "EUR",
    interval: "month",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID ?? "",
    revenueFrame: "Gemiddeld €500–€1.200+ per maand teruggewonnen",
    revenueDisclaimer: "Afhankelijk van praktijkgrootte en no-show percentage",
    features: [
      "Multi-chair optimalisatie",
      "Geavanceerde rapportage",
      "Snellere invulling",
    ],
  },
];
