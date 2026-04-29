import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { loadAppointmentFormOptions } from "@/lib/appointments/formOptions";
import { AppointmentForm, type AppointmentFormValues } from "@/components/appointments/AppointmentForm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (!UUID_RE.test(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const appt = await prisma.appointment.findFirst({
    where: { id, practiceId: user.practiceId },
  });
  if (!appt) notFound();

  const options = await loadAppointmentFormOptions(user.practiceId);

  const dur = Math.round(
    (appt.endTime.getTime() - appt.startTime.getTime()) / 60_000,
  );

  const initial: AppointmentFormValues = {
    clientId: appt.clientId,
    practitionerId: appt.practitionerId,
    appointmentTypeId: appt.appointmentTypeId ?? "",
    startTime: toLocalDatetime(appt.startTime),
    durationMinutes: dur,
    revenueEstimateEuros: ((Number.isFinite(appt.revenueEstimateCents) ? appt.revenueEstimateCents : 0) / 100).toFixed(2),
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
        Back to appointment
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">Edit appointment</h1>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <AppointmentForm mode="edit" appointmentId={appt.id} initial={initial} {...options} />
      </div>
    </div>
  );
}
