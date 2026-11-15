import { PRACTICE_TIME_ZONE } from "@/lib/practice-time";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AddToWaitlistButton } from "@/components/appointments/AddToWaitlistButton";
import { isUuid } from "@/lib/validations/uuid";

const riskColors: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-practice-link dark:bg-blue-900/30 ",
  CONFIRMED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  IN_PROGRESS: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELLED: "bg-practice-line text-practice-subtle ",
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

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d: Date) {
  return new Date(d).toLocaleString("nl-NL", {
    timeZone: PRACTICE_TIME_ZONE,
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
  if (!isUuid(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const patient = await prisma.client.findFirst({
    where: { id, practiceId: user.practiceId },
    include: {
      appointments: {
        where: { practiceId: user.practiceId },
        orderBy: { startTime: "desc" },
        take: 10,
        include: { appointmentType: { select: { name: true, color: true } } },
      },
      },
  });

  if (!patient) notFound();

  return (
    <div>
      <Link
        href="/patients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-practice-subtle hover:text-practice-heading"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar patiënten
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-practice-heading">
              {patient.firstName} {patient.lastName}
            </h1>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${riskColors[patient.riskLevel]}`}>
              {patient.riskLevel}
            </span>
            {!patient.isActive && (
              <span className="inline-flex rounded-full bg-practice-line px-2 py-0.5 text-xs font-medium text-practice-subtle">
                Inactief
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-practice-subtle">
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
            className="inline-flex items-center gap-2 rounded-lg border border-practice-field bg-practice-surface px-4 py-2 text-sm font-medium text-practice-ink hover:bg-practice-hover"
          >
            <Pencil className="h-4 w-4" />
            Bewerken
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact info */}
        <div className="rounded-xl border border-practice-line bg-practice-surface p-6">
          <h2 className="text-sm font-semibold text-practice-heading">Contactgegevens</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-practice-subtle" />
              <span className="text-practice-ink">{patient.email ?? "—"}</span>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-practice-subtle" />
              <span className="text-practice-ink">{patient.phone ?? "—"}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-practice-subtle" />
              <span className="text-practice-ink">
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
            <div className="border-t border-practice-line pt-3">
              <dt className="text-xs uppercase text-practice-subtle">Voorkeurskanaal</dt>
              <dd className="mt-1 text-practice-ink">{patient.communicationPreference}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-practice-subtle">Wachtlijst</dt>
              <dd className="mt-1 text-practice-ink">
                {patient.waitlistOptIn ? "Aangemeld" : "Niet aangemeld"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Personal */}
        <div className="rounded-xl border border-practice-line bg-practice-surface p-6">
          <h2 className="text-sm font-semibold text-practice-heading">Persoonlijk</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-practice-subtle">Geboortedatum</dt>
              <dd className="mt-1 text-practice-ink">{formatDate(patient.dateOfBirth)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-practice-subtle">BSN</dt>
              <dd className="mt-1 font-mono text-practice-ink">{patient.bsn ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-practice-subtle">Notities</dt>
              <dd className="mt-1 whitespace-pre-wrap text-practice-ink">{patient.notes ?? "—"}</dd>
            </div>
          </dl>
        </div>

        {/* Recent appointments */}
        <div className="rounded-xl border border-practice-line bg-practice-surface p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-practice-heading">
            <Calendar className="h-4 w-4" />
            Recente afspraken
          </h2>
          {patient.appointments.length === 0 ? (
            <p className="mt-4 text-sm text-practice-subtle">Nog geen afspraken.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {patient.appointments.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <div className="font-medium text-practice-heading">
                      {a.appointmentType?.name ?? "Afspraak"}
                    </div>
                    <div className="text-xs text-practice-subtle">{formatDateTime(a.startTime)}</div>
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
