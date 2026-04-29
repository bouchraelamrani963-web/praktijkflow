"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { AppointmentStatus } from "./AppointmentForm";

const statuses: { value: AppointmentStatus; label: string }[] = [
  { value: "SCHEDULED", label: "Gepland" },
  { value: "CONFIRMED", label: "Bevestigd" },
  { value: "IN_PROGRESS", label: "Bezig" },
  { value: "COMPLETED", label: "Afgerond" },
  { value: "CANCELLED", label: "Geannuleerd" },
  { value: "NO_SHOW", label: "Niet verschenen" },
];

export function StatusSelector({
  appointmentId,
  current,
}: {
  appointmentId: string;
  current: AppointmentStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<AppointmentStatus>(current);
  const [updating, setUpdating] = useState(false);

  async function handleChange(next: AppointmentStatus) {
    if (next === value) return;
    setUpdating(true);
    setValue(next);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Status bijwerken mislukt");
      toast.success("Status bijgewerkt");
      router.refresh();
    } catch (err) {
      setValue(current);
      toast.error(err instanceof Error ? err.message : "Bijwerken mislukt");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <select
      value={value}
      disabled={updating}
      onChange={(e) => handleChange(e.target.value as AppointmentStatus)}
      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
    >
      {statuses.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
