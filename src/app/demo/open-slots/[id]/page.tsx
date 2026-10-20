import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Mail, User } from "lucide-react";
import { DemoShell } from "../../DemoShell";
import { demoWorkItems } from "../../demo-data";

export default async function DemoOpenSlotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = demoWorkItems.find((entry) => entry.id === id);
  if (!item) notFound();

  return (
    <DemoShell>
      <main className="mx-auto max-w-4xl px-5 py-10">
        <Link href="/demo/dashboard" className="mb-5 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" />
          Terug naar dashboard demo
        </Link>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.badgeClass}`}>
                {item.category}
              </span>
              <h1 className="mt-3 text-2xl font-semibold text-slate-950">{item.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              Fictieve detailweergave
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Calendar className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Tijd</p>
                <p className="text-sm text-slate-800">{item.time}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <User className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Behandelaar</p>
                <p className="text-sm text-slate-800">{item.practitioner}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Clock className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Status</p>
                <p className="text-sm text-slate-800">{item.status}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Aanbiedingen</p>
                <p className="text-sm text-slate-800">{item.offers}</p>
              </div>
            </div>
          </div>

          <section className="mt-6 rounded-lg border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-950">Detailinformatie</h2>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-sm leading-6 text-slate-600">
              {item.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </section>

          <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            Deze knop is bewust read-only in de demo. Er wordt geen patiënt geselecteerd, geen bericht verstuurd en
            geen claim opgeslagen.
          </div>
        </div>
      </main>
    </DemoShell>
  );
}
