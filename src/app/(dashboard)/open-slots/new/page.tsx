import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { loadAppointmentFormOptions } from "@/lib/appointments/formOptions";
import { OpenSlotForm } from "@/components/open-slots/OpenSlotForm";

export default async function NewOpenSlotPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const { practitioners, types } = await loadAppointmentFormOptions(user.practiceId);

  return (
    <div>
      <Link
        href="/open-slots"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar open plekken
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
        Nieuwe open plek
      </h1>
      <OpenSlotForm practitioners={practitioners} types={types} />
    </div>
  );
}
