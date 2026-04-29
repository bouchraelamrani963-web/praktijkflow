"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Clock, CalendarClock, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ACTION_LABELS: Record<string, { verb: string; description: string; icon: LucideIcon }> = {
  confirm_appointment: { verb: "Bevestigen", description: "uw afspraak bevestigen", icon: CheckCircle },
  cancel_appointment: { verb: "Annuleren", description: "uw afspraak annuleren", icon: XCircle },
  claim_open_slot: { verb: "Plek claimen", description: "deze afspraakplek claimen", icon: CalendarClock },
};

interface Props {
  token: string;
  action: string;
  practiceName: string;
  clientName: string;
  appointmentTime?: string;
}

type Outcome = "idle" | "loading" | "success" | "expired" | "already_used" | "invalid" | "failed";

export function ActionExecutor({ token, action, practiceName, clientName, appointmentTime }: Props) {
  const [outcome, setOutcome] = useState<Outcome>("idle");
  const [message, setMessage] = useState("");

  const isClaim = action === "claim_open_slot";

  const labels = ACTION_LABELS[action] ?? { verb: "Doorgaan", description: "deze actie voltooien", icon: CheckCircle };
  const ButtonIcon = labels.icon;

  async function handleExecute() {
    setOutcome("loading");
    try {
      const res = await fetch("/api/tokens/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setOutcome(data.outcome ?? "failed");
      setMessage(data.message ?? "");
    } catch {
      setOutcome("failed");
      setMessage("Kan geen verbinding maken. Probeer het opnieuw.");
    }
  }

  // ─── SUCCESS ─────────────────────────────────────────────────────────────
  if (outcome === "success") {
    const title = isClaim ? "De afspraak is voor u gereserveerd" : message;
    const subtitle = isClaim
      ? appointmentTime
        ? `U wordt verwacht op ${appointmentTime} bij ${practiceName}.`
        : `U wordt verwacht bij ${practiceName}.`
      : "U kunt deze pagina sluiten.";

    return (
      <div className="text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-900">{title}</h2>
        <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
        {isClaim && (
          <p className="mt-4 text-xs text-zinc-400">
            Bewaar deze bevestiging. Een herinnering volgt per SMS.
          </p>
        )}
      </div>
    );
  }

  // ─── ALREADY USED (own link re-opened OR slot taken by someone else) ─────
  if (outcome === "already_used" || outcome === "failed") {
    // For claim flow: "failed" typically means another patient won the race
    const isSlotTaken = isClaim && outcome === "failed";
    const isAlreadyClaimed = isClaim && outcome === "already_used";

    return (
      <div className="text-center">
        <AlertTriangle className={`mx-auto h-16 w-16 ${isSlotTaken ? "text-amber-500" : "text-zinc-400"}`} />
        <h2 className="mt-4 text-xl font-semibold text-zinc-900">
          {isSlotTaken
            ? "Deze plek is al ingevuld"
            : isAlreadyClaimed
            ? "Deze link is al gebruikt"
            : message || "Actie niet gelukt"}
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          {isSlotTaken
            ? `Helaas was een andere patiënt u voor. Neem contact op met ${practiceName} voor een nieuwe afspraak.`
            : message
            ? `${message} Neem contact op met ${practiceName} voor hulp.`
            : `Neem contact op met ${practiceName} voor hulp.`}
        </p>
      </div>
    );
  }

  // ─── EXPIRED ─────────────────────────────────────────────────────────────
  if (outcome === "expired") {
    return (
      <div className="text-center">
        <Clock className="mx-auto h-16 w-16 text-amber-500" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-900">
          Deze link is verlopen
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          {isClaim
            ? `U heeft niet op tijd gereageerd. Neem contact op met ${practiceName} als u nog een afspraak wilt maken.`
            : `Neem contact op met ${practiceName} voor een nieuwe link.`}
        </p>
      </div>
    );
  }

  // ─── INVALID ─────────────────────────────────────────────────────────────
  if (outcome === "invalid") {
    return (
      <div className="text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-400" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-900">
          {message || "Ongeldige link"}
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Neem contact op met {practiceName} voor hulp.
        </p>
      </div>
    );
  }

  // ─── IDLE / LOADING — CTA screen ─────────────────────────────────────────
  return (
    <div className="text-center">
      <Clock className="mx-auto h-12 w-12 text-blue-500" />
      <h2 className="mt-4 text-xl font-semibold text-zinc-900">
        {clientName}, u staat op het punt om {labels.description}
      </h2>
      {appointmentTime && (
        <p className="mt-2 text-zinc-600">{appointmentTime}</p>
      )}
      <p className="mt-1 text-sm text-zinc-500">bij {practiceName}</p>

      {isClaim && (
        <p className="mt-3 text-xs text-amber-600">
          Let op: wie het eerst klikt, krijgt de plek.
        </p>
      )}

      <button
        onClick={handleExecute}
        disabled={outcome === "loading"}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {outcome === "loading" ? (
          "Verwerken…"
        ) : (
          <>
            <ButtonIcon className="h-4 w-4" />
            {labels.verb}
          </>
        )}
      </button>
    </div>
  );
}
