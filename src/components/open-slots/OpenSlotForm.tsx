"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { TYPE_LABELS } from "@/lib/labels";

interface PractitionerOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface TypeOption {
  id: string;
  name: string;
  durationMinutes: number;
}

interface Props {
  practitioners: PractitionerOption[];
  types: TypeOption[];
}

export function OpenSlotForm({ practitioners, types }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [practitionerId, setPractitionerId] = useState("");
  const [appointmentTypeId, setAppointmentTypeId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [notes, setNotes] = useState("");

  function handleTypeChange(typeId: string) {
    setAppointmentTypeId(typeId);
    const t = types.find((x) => x.id === typeId);
    if (t) setDurationMinutes(t.durationMinutes);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!practitionerId || !startTime) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/open-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practitionerId,
          appointmentTypeId: appointmentTypeId || undefined,
          startTime: new Date(startTime).toISOString(),
          durationMinutes,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Open plek aanmaken mislukt");
      }

      toast.success("Open plek aangemaakt");
      router.push("/open-slots");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Behandelaar *
        </label>
        <select
          value={practitionerId}
          onChange={(e) => setPractitionerId(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        >
          <option value="">Kies behandelaar</option>
          {practitioners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Type behandeling
        </label>
        <select
          value={appointmentTypeId}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        >
          <option value="">Geen</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {TYPE_LABELS[t.name] ?? t.name} ({t.durationMinutes} min)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Starttijd *
        </label>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Duur (min) *
        </label>
        <input
          type="number"
          min={5}
          max={480}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Notities
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Aanmaken…" : "Open plek aanmaken"}
        </button>
        <Link
          href="/open-slots"
          className="rounded-lg border border-zinc-300 px-6 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}
