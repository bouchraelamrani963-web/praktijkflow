import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findMatchesForSlot } from "@/lib/waitlist/matching";
import { isTwilioConfigured, isSmsTestMode } from "@/lib/twilio";
import { MatchesPanel } from "@/components/open-slots/MatchesPanel";

/**
 * "Vind patiënten" landing — the missing piece between the AVAILABLE slot
 * row on /open-slots and the patient-facing /action/<token> claim page.
 *
 * Server work:
 *   - Resolve + authorize the slot (must be AVAILABLE in the user's practice)
 *   - Pre-run findMatchesForSlot() so the page has data on first paint
 *     without an extra round-trip; the client can refresh if needed
 *   - Read isTwilioConfigured() here (env vars aren't browser-readable)
 *     and thread it down so the offer button can render an honest
 *     disabled state when SMS isn't configured.
 *
 * The actual offer POST and per-entry result rendering live in the
 * MatchesPanel client component below.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OpenSlotMatchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const slot = await prisma.openSlot.findFirst({
    where: { id, practiceId: user.practiceId },
    include: {
      practitioner: { select: { id: true, firstName: true, lastName: true } },
      appointmentType: { select: { id: true, name: true, color: true } },
    },
  });
  if (!slot) notFound();

  // Pre-run matches on the server so the page renders with data
  // immediately. Empty when the slot isn't AVAILABLE (e.g. already
  // CLAIMED) — the panel will render its empty state.
  const matches =
    slot.status === "AVAILABLE"
      ? await findMatchesForSlot(slot.id, user.practiceId)
      : [];

  // Three states: real (Twilio configured, no test mode), test (test mode
  // on — bypasses Twilio gate), disabled (neither). The panel uses
  // `smsAllowed` to enable the submit button and `smsTestMode` to toggle
  // the banner copy + claim-URL display.
  const smsConfigured = isTwilioConfigured();
  const smsTestMode = isSmsTestMode();
  const smsAllowed = smsConfigured || smsTestMode;

  return (
    <div className="max-w-4xl">
      <Link
        href="/open-slots"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar open plekken
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
        Patiënten matchen
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Stuur wachtlijst-patiënten een persoonlijke claim-link. Wie het eerst
        op de link klikt, krijgt de afspraak.
      </p>

      {/* Slot summary card */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
            <div>
              <div className="text-xs uppercase text-zinc-500">Wanneer</div>
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                {fmtDateTime(slot.startTime)}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
            <div>
              <div className="text-xs uppercase text-zinc-500">Duur</div>
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                {slot.durationMinutes} minuten
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
            <div>
              <div className="text-xs uppercase text-zinc-500">Behandelaar</div>
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                {slot.practitioner.firstName} {slot.practitioner.lastName}
              </div>
            </div>
          </div>
          {slot.appointmentType && (
            <div className="flex items-start gap-2">
              <span
                className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: slot.appointmentType.color }}
                aria-hidden="true"
              />
              <div>
                <div className="text-xs uppercase text-zinc-500">Type</div>
                <div className="text-sm text-zinc-700 dark:text-zinc-300">
                  {slot.appointmentType.name}
                </div>
              </div>
            </div>
          )}
        </div>

        {slot.status !== "AVAILABLE" && (
          <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            Deze plek is niet meer beschikbaar (status:{" "}
            <span className="font-semibold">{slot.status}</span>). U kunt geen
            nieuwe aanbiedingen meer versturen.
          </p>
        )}
      </div>

      <MatchesPanel
        slotId={slot.id}
        initialMatches={matches}
        smsConfigured={smsConfigured}
        smsTestMode={smsTestMode}
        smsAllowed={smsAllowed}
        slotAvailable={slot.status === "AVAILABLE"}
      />
    </div>
  );
}
