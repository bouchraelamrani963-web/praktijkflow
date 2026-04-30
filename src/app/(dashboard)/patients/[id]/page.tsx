import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AddToWaitlistButton } from "@/components/appointments/AddToWaitlistButton";

const riskColors: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  CONFIRMED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  IN_PROGRESS: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELLED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
  NO_SHOW: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Gepland",
  CONFIRMED: "Bevestigd",
  IN_PROGRESS: "Bezig",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
  NO_SHOW: "Niet verschenen",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d: Date) {
  return new Date(d).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const patient = await prisma.client.findFirst({
    where: { id, practiceId: user.practiceId },
    include: {
      appointments: {
        orderBy: { startTime: "desc" },
        take: 10,
        include: { appointmentType: { select: { name: true, color: true } } },
      },
      waitlistEntries: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!patient) notFound();

  return (
    <div>
      <Link
        href="/patients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar patiënten
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {patient.firstName} {patient.lastName}
            </h1>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${riskColors[patient.riskLevel]}`}>
              {patient.riskLevel}
            </span>
            {!patient.isActive && (
              <span className="inline-flex rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                Inactief
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Patiënt sinds {formatDate(patient.createdAt)}
          </p>
        </div>
        {/* Actions row — gives the patient detail page a direct path to put
            the patient on the waitlist (previously only reachable via an
            appointment, which made the workflow "where did my new patient go?"
            confusing). The button is wired to POST /api/waitlist with
            appointmentTypeId=null (any type) and isFlexible=true. */}
        <div className="flex flex-wrap items-center gap-2">
          <AddToWaitlistButton clientId={patient.id} appointmentTypeId={null} />
          <Link
            href={`/patients/${patient.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Pencil className="h-4 w-4" />
            Bewerken
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact info */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Contactgegevens</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              <span className="text-zinc-700 dark:text-zinc-300">{patient.email ?? "—"}</span>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              <span className="text-zinc-700 dark:text-zinc-300">{patient.phone ?? "—"}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              <span className="text-zinc-700 dark:text-zinc-300">
                {patient.address ? (
                  <>
                    {patient.address}
                    <br />
                    {patient.zipCode} {patient.city}
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <dt className="text-xs uppercase text-zinc-500">Voorkeurskanaal</dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{patient.communicationPreference}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500">Wachtlijst</dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                {patient.waitlistOptIn ? "Aangemeld" : "Niet aangemeld"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Personal */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Persoonlijk</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-zinc-500">Geboortedatum</dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{formatDate(patient.dateOfBirth)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500">BSN</dt>
              <dd className="mt-1 font-mono text-zinc-700 dark:text-zinc-300">{patient.bsn ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500">Notities</dt>
              <dd className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{patient.notes ?? "—"}</dd>
            </div>
          </dl>
        </div>

        {/* Recent appointments */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            <Calendar className="h-4 w-4" />
            Recente afspraken
          </h2>
          {patient.appointments.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Nog geen afspraken.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {patient.appointments.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-white">
                      {a.appointmentType?.name ?? "Afspraak"}
                    </div>
                    <div className="text-xs text-zinc-500">{formatDateTime(a.startTime)}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[a.status] ?? ""}`}>
                    {statusLabels[a.status] ?? a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
