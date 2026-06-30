import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { loadAppointmentFormOptions } from "@/lib/appointments/formOptions";
import { AppointmentForm, type AppointmentFormValues } from "@/components/appointments/AppointmentForm";
import { isUuid } from "@/lib/validations/uuid";

function toLocalDatetime(d: Date): string {
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const appt = await prisma.appointment.findFirst({
    where: { id, practiceId: user.practiceId },
    include: {
      // Multi-code list — empty for legacy appointments created before
      // the appointment_treatments table existed.
      treatments: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!appt) notFound();

  const options = await loadAppointmentFormOptions(user.practiceId);

  const dur = Math.round(
    (appt.endTime.getTime() - appt.startTime.getTime()) / 60_000,
  );

  // Backward-compat seed for the form's `treatments` array:
  //   - New appointments: rehydrate the saved AppointmentTreatment rows.
  //   - Legacy appointments (no treatments[] but has appointmentTypeId):
  //     synthesise a single-row array so the picker shows that one code
  //     instead of an empty list, letting the user add more or replace it.
  const treatments: AppointmentFormValues["treatments"] =
    appt.treatments.length > 0
      ? appt.treatments.map((t) => ({
          appointmentTypeId: t.appointmentTypeId,
          quantity: t.quantity,
        }))
      : appt.appointmentTypeId
        ? [{ appointmentTypeId: appt.appointmentTypeId, quantity: 1 }]
        : [];

  const initial: AppointmentFormValues = {
    clientId: appt.clientId,
    practitionerId: appt.practitionerId,
    treatments,
    appointmentTypeId: appt.appointmentTypeId ?? "",
    startTime: toLocalDatetime(appt.startTime),
    durationMinutes: dur,
    revenueEstimateEuros: ((Number.isFinite(appt.revenueEstimateCents) ? appt.revenueEstimateCents : 0) / 100).toFixed(2),
    // Edit mode: persisted duration/revenue counts as user-set, so the
    // auto-recompute won't overwrite them unless the user actively
    // modifies the treatments array.
    revenueDirty: true,
    durationDirty: true,
    status: appt.status as AppointmentFormValues["status"],
    notes: appt.notes ?? "",
  };

  return (
    <div className="max-w-3xl">
      <Link
        href={`/appointments/${appt.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar afspraak
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">Afspraak bewerken</h1>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <AppointmentForm mode="edit" appointmentId={appt.id} initial={initial} {...options} />
      </div>
    </div>
  );
}
