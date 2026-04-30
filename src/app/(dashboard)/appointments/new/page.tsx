import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles, UserPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { loadAppointmentFormOptions } from "@/lib/appointments/formOptions";
import { AppointmentForm, emptyAppointment } from "@/components/appointments/AppointmentForm";

export default async function NewAppointmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const options = await loadAppointmentFormOptions(user.practiceId);

  // Empty-state guard: if there are no patients OR no practitioners, the
  // form is structurally unusable (the required <select>s have 0 options).
  // Previously the page rendered the broken form, which read as a "blank
  // black page" against the dark dashboard. Now we show a clear hint
  // pointing to the next step (seed demo data or add a patient first).
  const optionsEmpty =
    options.clients.length === 0 || options.practitioners.length === 0;

  return (
    <div className="max-w-3xl">
      <Link
        href="/appointments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar afspraken
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
        Nieuwe afspraak
      </h1>

      {optionsEmpty ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-900/10">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-3 text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold">
                Nog geen patiënten of behandelaren beschikbaar
              </p>
              <p className="text-amber-800/90 dark:text-amber-200/90">
                Een nieuwe afspraak heeft minstens één patiënt en één
                behandelaar nodig. Deze zijn er nog niet in uw praktijk.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {options.clients.length === 0 && (
                  <Link
                    href="/patients/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Voeg eerste patiënt toe
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-400/60 bg-white/60 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-white dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50"
                >
                  Terug naar dashboard
                </Link>
              </div>
              <p className="pt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
                Tip: gebruik de knop <strong>Demo-data laden</strong> bovenaan
                het dashboard om in één klik een complete demo-praktijk met
                15 patiënten en 2 behandelaren aan te maken.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <AppointmentForm mode="create" initial={emptyAppointment} {...options} />
        </div>
      )}
    </div>
  );
}
