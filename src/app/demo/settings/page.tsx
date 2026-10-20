import Link from "next/link";
import { Settings } from "lucide-react";
import { DemoShell } from "../DemoShell";

const demoSettings = [
  {
    label: "Berichten",
    value: "Testmodus actief",
    description: "Er worden geen echte e-mails of SMS-berichten verstuurd.",
  },
  {
    label: "Betalingen",
    value: "Uitgeschakeld",
    description: "Stripe-checkout is niet verbonden in deze lokale demo.",
  },
  {
    label: "Database",
    value: "Niet gekoppeld",
    description: "Alle gegevens op deze pagina's zijn fictief en statisch.",
  },
  {
    label: "Automatische verzending",
    value: "Uit",
    description: "Automatische productie-acties zijn bewust niet actief in de demo.",
  },
];

export default function DemoSettingsPage() {
  return (
    <DemoShell>
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Instellingen</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Demo-instellingen</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Deze pagina laat zien welke onderdelen bewust zijn uitgeschakeld zodat de demo veilig lokaal blijft.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            <Settings className="h-4 w-4" />
            Veilig lokaal
          </span>
        </header>

        <section aria-labelledby="settings-heading" className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 id="settings-heading" className="text-base font-semibold text-slate-950">
              Status van integraties
            </h2>
          </div>
          <dl className="divide-y divide-slate-100">
            {demoSettings.map((setting) => (
              <div key={setting.label} className="grid gap-2 px-4 py-3 sm:grid-cols-[12rem_12rem_1fr] sm:items-center">
                <dt className="text-sm font-semibold text-slate-950">{setting.label}</dt>
                <dd className="w-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{setting.value}</dd>
                <dd className="text-sm leading-6 text-slate-600">{setting.description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Link href="/demo/dashboard" className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
          Terug naar dashboard
        </Link>
      </main>
    </DemoShell>
  );
}
