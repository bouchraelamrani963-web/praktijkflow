import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { loadAppointmentFormOptions } from "@/lib/appointments/formOptions";
import { AppointmentForm, emptyAppointment } from "@/components/appointments/AppointmentForm";

export default async function NewAppointmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const options = await loadAppointmentFormOptions(user.practiceId);

  return (
    <div className="max-w-3xl">
      <Link
        href="/appointments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to appointments
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">New appointment</h1>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <AppointmentForm mode="create" initial={emptyAppointment} {...options} />
      </div>
    </div>
  );
}
