"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  appointmentId: string;
  type: "48h" | "24h";
  alreadySent: boolean;
  hasPhone: boolean;
}

export function ReminderButton({ appointmentId, type, alreadySent, hasPhone }: Props) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  const label = type === "48h" ? "48u herinnering" : "24u herinnering";

  if (alreadySent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
        <MessageSquare className="h-3.5 w-3.5" />
        {label} verzonden
      </span>
    );
  }

  if (!hasPhone) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
        title="Patiënt heeft geen telefoonnummer"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {label} — geen telefoon
      </span>
    );
  }

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();

      if (!res.ok && res.status !== 200) {
        throw new Error(data.reminder?.reason ?? data.error ?? "Versturen mislukt");
      }

      const status = data.reminder?.status;
      if (status === "sent" || status === "mock") {
        toast.success(`${label} ${status === "mock" ? "verzonden (mock)" : "verzonden"}`);
      } else if (status === "skipped") {
        toast(data.reminder?.reason ?? "Overgeslagen", { icon: "⏭️" });
      } else {
        toast.error(data.reminder?.reason ?? "Mislukt");
      }

      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verzenden mislukt");
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={sending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
    >
      <MessageSquare className="h-3.5 w-3.5" />
      {sending ? "Verzenden…" : `Verstuur ${label}`}
    </button>
  );
}
