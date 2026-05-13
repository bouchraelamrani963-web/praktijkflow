import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findMatchesForSlot } from "@/lib/waitlist/matching";
import { isTwilioConfigured, isSmsTestMode, extractActionUrl } from "@/lib/twilio";
import { MatchesPanel } from "@/components/open-slots/MatchesPanel";

interface PersistedOffer {
  waitlistEntryId: string;
  clientName: string;
  status: "sent";
  claimUrl?: string;
}

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
  // immediately. Empty when the slot is CLAIMED/EXPIRED — the panel
  // will render its empty state. OFFERED slots still show matches
  // so the operator can re-offer or view existing offers.
  const matches =
    slot.status === "AVAILABLE" || slot.status === "OFFERED"
      ? await findMatchesForSlot(slot.id, user.practiceId)
      : [];

  // Three states: real (Twilio configured, no test mode), test (test mode
  // on — bypasses Twilio gate), disabled (neither). The panel uses
  // `smsAllowed` to enable the submit button and `smsTestMode` to toggle
  // the banner copy + claim-URL display.
  const smsConfigured = isTwilioConfigured();
  const smsTestMode = isSmsTestMode();
  const smsAllowed = smsConfigured || smsTestMode;

  // ─── Persisted offers ─────────────────────────────────────────────────
  // When the slot is OFFERED, load MessageLog records so the matches panel
  // can show per-patient offer status (and claim links in test mode) even
  // after navigation/refresh. In real mode we never surface claim URLs.
  let persistedOffers: PersistedOffer[] = [];
  if (slot.status === "OFFERED" && slot.sourceAppointmentId) {
    const logs = await prisma.messageLog.findMany({
      where: {
        practiceId: user.practiceId,
        appointmentId: slot.sourceAppointmentId,
        channel: "sms",
        status: { in: ["sent", "mock"] },
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Load OFFERED waitlist entries for this practice so we can resolve
    // waitlistEntryId for each log (matches only contains WAITING entries
    // which have already been flipped to OFFERED after sending).
    const offeredEntries = await prisma.waitlistEntry.findMany({
      where: {
        practiceId: user.practiceId,
        status: "OFFERED",
        clientId: { in: logs.map((l) => l.clientId) },
      },
      select: { id: true, clientId: true },
    });
    const entryByClientId = new Map(offeredEntries.map((e) => [e.clientId, e]));

    // Deduplicate by clientId — keep only the most recent log per client
    const seen = new Set<string>();
    for (const log of logs) {
      if (!log.client || seen.has(log.clientId)) continue;
      seen.add(log.clientId);

      const entry = entryByClientId.get(log.clientId);

      const offer: PersistedOffer = {
        waitlistEntryId: entry?.id ?? log.clientId,
        clientName: `${log.client.firstName} ${log.client.lastName}`,
        status: "sent",
      };

      // Only surface claim URL in test mode
      if (smsTestMode && log.body) {
        const url = extractActionUrl(log.body);
        if (url) offer.claimUrl = url;
      }

      persistedOffers.push(offer);
    }
  }

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

        {slot.status !== "AVAILABLE" && slot.status !== "OFFERED" && (
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
        slotAvailable={slot.status === "AVAILABLE" || slot.status === "OFFERED"}
        persistedOffers={persistedOffers}
      />
    </div>
  );
}
