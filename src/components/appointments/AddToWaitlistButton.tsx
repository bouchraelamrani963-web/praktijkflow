"use client";

import { useState } from "react";
import Link from "next/link";
import { ListPlus, Check, Loader2, ArrowRight } from "lucide-react";

interface Props {
  clientId: string;
  appointmentTypeId: string | null;
}

export function AddToWaitlistButton({ clientId, appointmentTypeId }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [entryId, setEntryId] = useState<string | null>(null);

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          ...(appointmentTypeId ? { appointmentTypeId } : {}),
          isFlexible: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => null);
      setEntryId(data?.waitlistEntry?.id ?? null);
      setState("done");
      setMsg("Toegevoegd aan wachtlijst");
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Er is iets misgegaan");
    }
  }

  if (state === "done") {
    return (
      <div className="inline-flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          <Check className="h-4 w-4" />
          {msg}
        </span>
        <Link
          href={entryId ? `/waitlist/${entryId}` : "/waitlist?status=WAITING"}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Bekijk wachtlijst
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className="inline-flex items-center gap-2 rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50 dark:border-purple-700 dark:bg-zinc-800 dark:text-purple-300 dark:hover:bg-zinc-700"
      >
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ListPlus className="h-4 w-4" />
        )}
        Voeg toe aan wachtlijst
      </button>
      {state === "error" && (
        <p className="text-xs text-red-600">{msg}</p>
      )}
    </div>
  );
}
