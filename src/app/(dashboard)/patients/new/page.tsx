"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PatientForm, emptyPatient } from "@/components/patients/PatientForm";

export default function NewPatientPage() {
  return (
    <div className="max-w-3xl">
      <Link
        href="/patients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to patients
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">New patient</h1>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <PatientForm mode="create" initial={emptyPatient} />
      </div>
    </div>
  );
}
