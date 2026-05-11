"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Send, Phone, Mail, AlertTriangle, CheckCircle2, MessageSquare, Copy, FlaskConical } from "lucide-react";
import toast from "react-hot-toast";

/**
 * Mirror of the MatchedEntry shape returned by /api/open-slots/[id]/matches
 * (which itself comes from lib/waitlist/matching.ts → findMatchesForSlot).
 */
export interface MatchedEntry {
  id: string;                       // WaitlistEntry id
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  preferredDay: string | null;
  preferredTime: string | null;
  appointmentTypeId: string | null;
  appointmentTypeName: string | null;
  score: number;
  reasons: string[];
}

interface Props {
  slotId: string;
  initialMatches: MatchedEntry[];
  /** Twilio SDK env vars are present (real send possible). */
  smsConfigured: boolean;
  /** SMS_TEST_MODE=true on the server (mock send + claim URL surfaced). */
  smsTestMode: boolean;
  /** Convenience flag: smsConfigured || smsTestMode. Drives the submit
   *  button enable state. */
  smsAllowed: boolean;
  slotAvailable: boolean;
}

interface OfferResult {
  waitlistEntryId: string;
  clientName: string;
  status: "sent" | "failed" | "no_phone" | "not_eligible";
  reason?: string;
  /** Only present when SMS_TEST_MODE=true. Operator clicks this to walk
   *  the claim flow as if they were the patient. */
  claimUrl?: string;
}

/**
 * Client UI for the "Vind patiënten" action. Server pre-loads the matches
 * via findMatchesForSlot(); this panel:
 *   - lets the practice owner tick checkboxes
 *   - submits a bulk POST to /api/open-slots/[slotId]/offer
 *   - shows per-entry results inline
 *   - refreshes the parent server component on success so the slot status
 *     and offered counts update in the list.
 *
 * Twilio-not-configured state is rendered as a disabled button + clear
 * banner — no requests fire, no fake success.
 */
export function MatchesPanel({
  slotId,
  initialMatches,
  // smsConfigured is part of the contract for completeness but the panel
  // gates everything off the unified `smsAllowed` (= configured || test mode).
  // Kept in the Props interface so callers stay explicit about what they pass.
  smsTestMode,
  smsAllowed,
  slotAvailable,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<OfferResult[] | null>(null);

  const matches = initialMatches;

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === matches.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(matches.filter((m) => m.clientPhone).map((m) => m.id)));
    }
  }

  const selectedCount = selected.size;
  const selectedWithPhone = useMemo(
    () => matches.filter((m) => selected.has(m.id) && m.clientPhone).length,
    [matches, selected],
  );

  async function handleOffer() {
    if (selectedCount === 0) {
      toast.error("Selecteer minstens één patiënt.");
      return;
    }
    if (!smsAllowed) {
      toast.error("SMS is niet geconfigureerd op de server.");
      return;
    }
    setSending(true);
    setResults(null);
    try {
      const res = await fetch(`/api/open-slots/${slotId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waitlistEntryIds: Array.from(selected),
          channel: "sms",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? data.error ?? "Versturen mislukt");
        if (data.error === "SMS niet geconfigureerd") {
          // smsConfigured prop is from server render — if state shifted at
          // runtime, surface it in the inline panel below for the operator.
          setResults([
            {
              waitlistEntryId: "_global_",
              clientName: "Server",
              status: "failed",
              reason: data.message ?? "SMS niet geconfigureerd",
            },
          ]);
        }
        return;
      }
      setResults(data.results ?? []);
      const sent = data.sent ?? 0;
      const failed = data.failed ?? 0;
      if (sent > 0 && failed === 0) {
        toast.success(`${sent} aanbod${sent === 1 ? "" : "s"} verzonden.`);
      } else if (sent > 0 && failed > 0) {
        toast(`${sent} verzonden, ${failed} mislukt.`, { icon: "ℹ️" });
      } else {
        toast.error("Geen aanbiedingen verzonden.");
      }
      // Refresh server-rendered slot status / list so the rest of the UI
      // reflects the new OFFERED waitlist transitions.
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Versturen mislukt");
    } finally {
      setSending(false);
    }
  }

  const resultByEntry = useMemo(() => {
    const m = new Map<string, OfferResult>();
    for (const r of results ?? []) m.set(r.waitlistEntryId, r);
    return m;
  }, [results]);

  // ─── Empty / no-matches state ───────────────────────────────────────────
  if (!slotAvailable && matches.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Geen matches beschikbaar.
        </p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-white">
          Geen wachtende patiënten gevonden
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Wanneer patiënten zich op de wachtlijst plaatsen, verschijnen ze hier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Honest send-state banner — three states, mutually exclusive:
          (1) neither test mode nor real Twilio → amber, button disabled
          (2) test mode on (regardless of Twilio) → blue, no real SMS, claim
              URLs surfaced inline so the operator can walk the flow
          (3) Twilio configured + test mode off → no banner (default real send)
      */}
      {!smsAllowed ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
          <div>
            <strong className="font-semibold">SMS niet geconfigureerd.</strong>{" "}
            Stel <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> en{" "}
            <code>TWILIO_PHONE_NUMBER</code> in op de server om aanbiedingen te
            kunnen versturen — of zet <code>SMS_TEST_MODE=true</code> voor een
            testronde zonder echte SMS. Knop is uitgeschakeld zolang dit ontbreekt.
          </div>
        </div>
      ) : smsTestMode ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
        >
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
          <div>
            <strong className="font-semibold">SMS-testmodus actief.</strong>{" "}
            Er worden <em>geen</em> echte SMS-berichten verstuurd. Na &quot;Stuur
            aanbod&quot; verschijnt per patiënt een claim-link die u zelf kunt
            openen om de claim-flow te doorlopen. Zet <code>SMS_TEST_MODE=false</code>{" "}
            zodra u echte berichten wilt versturen.
          </div>
        </div>
      ) : null}

      {/* Header with select-all + bulk action */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="match-select-all"
            checked={selectedCount > 0 && selected.size === matches.filter((m) => m.clientPhone).length}
            onChange={toggleAll}
            disabled={!slotAvailable || !smsAllowed || matches.every((m) => !m.clientPhone)}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <label htmlFor="match-select-all" className="text-sm text-zinc-700 dark:text-zinc-300">
            {selectedCount === 0
              ? `${matches.length} ${matches.length === 1 ? "match" : "matches"}`
              : `${selectedCount} geselecteerd · ${selectedWithPhone} met telefoon`}
          </label>
        </div>
        <button
          type="button"
          onClick={handleOffer}
          disabled={!slotAvailable || !smsAllowed || sending || selectedCount === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {sending ? "Verzenden…" : "Stuur aanbod"}
        </button>
      </div>

      {/* Matches table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500" />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Patiënt</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Voorkeur</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Match</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {matches.map((m) => {
                const r = resultByEntry.get(m.id);
                const noPhone = !m.clientPhone;
                return (
                  <tr key={m.id} className={noPhone ? "opacity-60" : ""}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Selecteer ${m.clientName}`}
                        checked={selected.has(m.id)}
                        onChange={() => toggle(m.id)}
                        disabled={!slotAvailable || !smsAllowed || noPhone || sending}
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">
                      {m.clientName}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      <div className="flex flex-col gap-1">
                        {m.clientPhone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {m.clientPhone}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Phone className="h-3 w-3" />
                            geen telefoon
                          </span>
                        )}
                        {m.clientEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {m.clientEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      <div className="flex flex-col gap-0.5">
                        {m.appointmentTypeName && <span>{m.appointmentTypeName}</span>}
                        {m.preferredDay && <span>Dag: {m.preferredDay}</span>}
                        {m.preferredTime && <span>Tijd: {m.preferredTime}</span>}
                        {!m.appointmentTypeName && !m.preferredDay && !m.preferredTime && (
                          <span className="italic">Geen voorkeur</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-white">
                          {m.score}
                        </span>
                        <span className="text-zinc-500" title={m.reasons.join(" · ")}>
                          {m.reasons.slice(0, 2).join(", ")}
                          {m.reasons.length > 2 && "…"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r ? (
                        r.status === "sent" ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              {r.claimUrl ? "Mock verzonden" : "Verzonden"}
                            </span>
                            {/* Test-mode only: surface the claim URL so the
                                operator can walk the patient flow themselves.
                                In real mode the patient receives this via SMS
                                and we deliberately never echo it back here
                                (avoids leaking tokens into screenshots/logs). */}
                            {r.claimUrl && (
                              <div className="flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 dark:border-blue-800 dark:bg-blue-900/20">
                                <FlaskConical className="h-3 w-3 shrink-0 text-blue-600 dark:text-blue-300" />
                                <a
                                  href={r.claimUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="truncate font-mono text-[11px] text-blue-700 hover:underline dark:text-blue-300"
                                  title={r.claimUrl}
                                  style={{ maxWidth: "16rem" }}
                                >
                                  {r.claimUrl.replace(/^https?:\/\//, "")}
                                </a>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(r.claimUrl!);
                                      toast.success("Claim-link gekopieerd");
                                    } catch {
                                      toast.error("Kopiëren mislukt");
                                    }
                                  }}
                                  className="ml-auto inline-flex items-center rounded p-0.5 text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
                                  aria-label="Kopieer claim-link"
                                  title="Kopieer claim-link"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : r.status === "no_phone" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            Geen telefoon
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            title={r.reason}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {r.status === "not_eligible" ? "Niet geldig" : "Mislukt"}
                          </span>
                        )
                      ) : noPhone ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        <span className="flex items-center gap-1 text-zinc-500">
                          <MessageSquare className="h-3 w-3" />
                          Klaar voor verzending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
