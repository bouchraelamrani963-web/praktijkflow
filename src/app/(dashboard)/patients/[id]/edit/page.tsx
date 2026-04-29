import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PatientForm, type PatientFormValues } from "@/components/patients/PatientForm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toInputDate(d: Date | null): string {
  if (!d) return "";
  const iso = new Date(d).toISOString();
  return iso.slice(0, 10);
}

export default async function EditPatientPage({
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
  });
  if (!patient) notFound();

  const initial: PatientFormValues = {
    firstName: patient.firstName,
    lastName: patient.lastName,
    email: patient.email ?? "",
    phone: patient.phone ?? "",
    dateOfBirth: toInputDate(patient.dateOfBirth),
    bsn: patient.bsn ?? "",
    address: patient.address ?? "",
    city: patient.city ?? "",
    zipCode: patient.zipCode ?? "",
    riskLevel: patient.riskLevel,
    notes: patient.notes ?? "",
    isActive: patient.isActive,
    waitlistOptIn: patient.waitlistOptIn,
    communicationPreference: patient.communicationPreference,
  };

  return (
    <div className="max-w-3xl">
      <Link
        href={`/patients/${patient.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to patient
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
        Edit {patient.firstName} {patient.lastName}
      </h1>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <PatientForm mode="edit" patientId={patient.id} initial={initial} />
      </div>
    </div>
  );
}
