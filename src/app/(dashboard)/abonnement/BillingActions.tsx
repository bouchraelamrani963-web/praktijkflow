"use client";

import { useState } from "react";

export function BillingActions({
  plan, portal = false, ready, canManage, hasActiveSubscription,
}: {
  plan?: "starter" | "pro" | "enterprise";
  portal?: boolean;
  ready: boolean;
  canManage: boolean;
  hasActiveSubscription: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!ready || !canManage || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(portal ? "/api/stripe/portal" : "/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: portal ? "{}" : JSON.stringify({ plan }),
      });
      const data: { url?: string; error?: string } = await response.json();
      if (!response.ok || !data.url || !data.url.startsWith("https://checkout.stripe.com/") &&
          !data.url.startsWith("https://billing.stripe.com/")) {
        throw new Error(data.error ?? "Stripe is nog niet beschikbaar.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stripe is niet beschikbaar.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={onClick}
        disabled={!ready || !canManage || busy || (!portal && hasActiveSubscription)}
        className="w-full rounded-sm bg-[#1D4B3C] px-4 py-3 text-xs font-bold text-white hover:bg-[#32664E] disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "Stripe openen…" : portal ? "Abonnement beheren (test)" : "Kies dit pakket (test)"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
