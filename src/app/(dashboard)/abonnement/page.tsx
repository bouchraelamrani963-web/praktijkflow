import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSubscriptionForPractice } from "@/lib/billing/subscription";
import { STRIPE_PLANS, configuredStripePriceId } from "@/lib/billing/stripe-plans";
import { BillingActions } from "./BillingActions";

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export default async function AbonnementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");
  const current = await getSubscriptionForPractice(user.practiceId);
  const canManage = user.role === "OWNER";
  const testReady = Boolean(
    process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") &&
    process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") &&
    (Object.keys(STRIPE_PLANS) as Array<keyof typeof STRIPE_PLANS>).every(configuredStripePriceId) &&
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") &&
    !process.env.NEXT_PUBLIC_APP_URL?.includes("noshowcontrol.nl"),
  );

  return (
    <div className="max-w-5xl space-y-8">
      <header className="border-b border-[#DBE4D9] pb-7">
        <p className="text-[10px] font-bold tracking-[0.18em] text-[#A66B4F]">PRAKTIJKBEHEER</p>
        <h1 className="mt-2 font-[Manrope] text-3xl font-bold text-[#234B3B]">Abonnement</h1>
        <p className="mt-2 text-sm leading-6 text-[#657D6C]">Beheer uw pakket en bekijk de status van de Stripe-testkoppeling.</p>
      </header>
      <section className="border border-[#D7E2D6] bg-white p-6">
        <h2 className="text-base font-semibold text-[#254D3D]">Huidige status</h2>
        <p className="mt-3 text-sm text-[#44634F]">
          {current ? `Abonnement: ${current.plan} · Status: ${current.status}` : "Er is nog geen betaald abonnement geregistreerd voor deze praktijk."}
        </p>
        <p className="mt-2 text-xs text-[#718779]">Aanmelden is momenteel mogelijk zonder betaling. Alleen een geldige Stripe-webhook kan een betaald abonnement activeren.</p>
        {!canManage && <p className="mt-3 text-sm text-[#98523E]">Alleen de praktijkeigenaar kan een abonnement aanpassen.</p>}
      </section>
      <section aria-labelledby="plan-options" className="space-y-4">
        <h2 id="plan-options" className="font-[Manrope] text-xl font-bold text-[#254D3D]">Kies uw pakket</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.entries(STRIPE_PLANS) as Array<[keyof typeof STRIPE_PLANS, typeof STRIPE_PLANS[keyof typeof STRIPE_PLANS]]>).map(([id, plan]) => (
            <div key={id} className="flex flex-col justify-between border border-[#D9E3D8] bg-white p-5">
              <div>
                <h3 className="font-[Manrope] text-lg font-semibold text-[#254D3D]">{plan.label}</h3>
                <p className="mt-3 text-2xl font-bold text-[#1B4839]">{euro.format(plan.amount / 100)} <span className="text-sm font-normal">/ maand</span></p>
                <p className="mt-1 text-xs text-[#6D836F]">Inclusief 21% btw</p>
              </div>
              <div className="mt-6">
                <BillingActions plan={id} ready={testReady} canManage={canManage} hasActiveSubscription={current?.status === "ACTIVE" || current?.status === "TRIALING" || current?.status === "PAST_DUE"} />
              </div>
            </div>
          ))}
        </div>
      </section>
      {!testReady && (
        <p className="border-l-4 border-[#B87954] bg-[#F1F3EB] px-5 py-4 text-sm leading-6 text-[#667E6D]">
          Stripe-testbetalingen zijn nog niet gekoppeld aan een eigen NoShow Control Stripe-testaccount.
          Deze knoppen blijven uitgeschakeld tot alle veilige testinstellingen gereed zijn. Er wordt niets afgeschreven.
        </p>
      )}
      {current?.stripeCustomerId && canManage && <BillingActions portal ready={testReady} canManage={canManage} hasActiveSubscription />}
      <p className="text-xs text-[#7F9282]">Meer informatie over de pakketten? <Link href="/pricing" className="underline">Bekijk de tarievenpagina.</Link></p>
    </div>
  );
}
