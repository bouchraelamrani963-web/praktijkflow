/**
 * Idempotent demo-data seeder.
 *
 * Designed to be safe to call from two contexts:
 *   1. CLI: `npm run db:seed` → prisma/seed.ts wraps this.
 *   2. API: POST /api/admin/seed-demo → triggered by the demo banner button.
 *
 * Idempotency contract: if a practice with the canonical demo slug already
 * exists, the function returns early WITHOUT touching any data. The button
 * click is therefore safe to mash repeatedly. Re-seeding requires an
 * explicit DB reset (`npx prisma migrate reset`) — destructive ops are NOT
 * exposed via the API to prevent accidental data loss against a real DB.
 *
 * Multi-tenancy: every row inserted carries `practiceId` referencing the
 * single demo practice. No global mocks, no shared state.
 */

import type { PrismaClient } from "@/generated/prisma/client";

export const DEMO_PRACTICE_SLUG = "praktijk-amsterdam-centrum";

export interface SeedResult {
  /** True if seed was a no-op because demo practice already existed. */
  alreadySeeded: boolean;
  /** Row counts after seeding (or current counts if already seeded). */
  counts: {
    practices: number;
    users: number;
    clients: number;
    appointments: number;
    openSlots: number;
    appointmentTypes: number;
    availabilitySlots: number;
    waitlistEntries: number;
    messageTemplates: number;
    invoices: number;
    invoiceItems: number;
  };
  /** Wall-clock duration of the seed, in milliseconds. */
  durationMs: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function dateAt(daysOffset: number, hour: number, minute = 0): Date {
  const d = daysFromNow(daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function pastDate(daysAgo: number): Date {
  return daysFromNow(-daysAgo);
}

// ─── Dutch-realistic patient names ──────────────────────────────────────────

const clientData = [
  { firstName: "Sophie", lastName: "de Vries",     email: "sophie.devries@email.nl",  phone: "+31612345001", dob: "1985-03-14", city: "Amsterdam",  zip: "1012AB" },
  { firstName: "Jan",    lastName: "Bakker",        email: "jan.bakker@email.nl",      phone: "+31612345002", dob: "1978-07-22", city: "Rotterdam",  zip: "3011AA" },
  { firstName: "Maria",  lastName: "Jansen",        email: "maria.jansen@email.nl",    phone: "+31612345003", dob: "1992-11-05", city: "Utrecht",    zip: "3511AB" },
  { firstName: "Pieter", lastName: "van den Berg",  email: "pieter.vdberg@email.nl",   phone: "+31612345004", dob: "1968-01-30", city: "Den Haag",   zip: "2511AA" },
  { firstName: "Lisa",   lastName: "Visser",        email: "lisa.visser@email.nl",     phone: "+31612345005", dob: "1990-06-18", city: "Amsterdam",  zip: "1013BH" },
  { firstName: "Thomas", lastName: "Smit",          email: "thomas.smit@email.nl",     phone: "+31612345006", dob: "1975-09-02", city: "Haarlem",    zip: "2011AA" },
  { firstName: "Emma",   lastName: "Meijer",        email: "emma.meijer@email.nl",     phone: "+31612345007", dob: "1999-12-24", city: "Leiden",     zip: "2311AB" },
  { firstName: "Daan",   lastName: "de Groot",      email: "daan.degroot@email.nl",    phone: "+31612345008", dob: "1982-04-10", city: "Amsterdam",  zip: "1071CJ" },
  { firstName: "Anne",   lastName: "Bos",           email: "anne.bos@email.nl",        phone: "+31612345009", dob: "1988-08-15", city: "Amstelveen", zip: "1181AA" },
  { firstName: "Luc",    lastName: "Hendriks",      email: "luc.hendriks@email.nl",    phone: "+31612345010", dob: "1965-02-28", city: "Hilversum",  zip: "1211AB" },
  { firstName: "Fleur",  lastName: "Dekker",        email: "fleur.dekker@email.nl",    phone: "+31612345011", dob: "1995-05-09", city: "Amsterdam",  zip: "1018WB" },
  { firstName: "Bram",   lastName: "Dijkstra",      email: "bram.dijkstra@email.nl",   phone: "+31612345012", dob: "1971-10-17", city: "Zaandam",    zip: "1501AA" },
  { firstName: "Sanne",  lastName: "Mulder",        email: "sanne.mulder@email.nl",    phone: "+31612345013", dob: "2001-01-03", city: "Diemen",     zip: "1111AA" },
  { firstName: "Kees",   lastName: "van Dijk",      email: "kees.vandijk@email.nl",    phone: "+31612345014", dob: "1958-06-25", city: "Bussum",     zip: "1401AA" },
  { firstName: "Iris",   lastName: "Willems",       email: "iris.willems@email.nl",    phone: "+31612345015", dob: "1993-03-31", city: "Amsterdam",  zip: "1052AA" },
] as const;

const riskLevels = [
  "LOW", "LOW", "LOW", "LOW", "LOW", "LOW", "LOW", "LOW", "LOW",
  "MEDIUM", "MEDIUM", "MEDIUM",
  "HIGH", "HIGH", "CRITICAL",
] as const;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns the row counts for the entire database. Used by both the
 * already-seeded short-circuit path and the post-seed summary.
 */
async function countRows(prisma: PrismaClient) {
  const [
    practices, users, clients, appointments, openSlots,
    appointmentTypes, availabilitySlots, waitlistEntries,
    messageTemplates, invoices, invoiceItems,
  ] = await Promise.all([
    prisma.practice.count(),
    prisma.user.count(),
    prisma.client.count(),
    prisma.appointment.count(),
    prisma.openSlot.count(),
    prisma.appointmentType.count(),
    prisma.availabilitySlot.count(),
    prisma.waitlistEntry.count(),
    prisma.messageTemplate.count(),
    prisma.invoice.count(),
    prisma.invoiceItem.count(),
  ]);
  return {
    practices, users, clients, appointments, openSlots,
    appointmentTypes, availabilitySlots, waitlistEntries,
    messageTemplates, invoices, invoiceItems,
  };
}

/**
 * Run the demo seed. Idempotent: returns `{ alreadySeeded: true }` without
 * touching data when the demo practice already exists.
 *
 * Inserts:
 *   - 1 practice (Praktijk Amsterdam Centrum)
 *   - 2 practitioners (Dr. Klein, Dr. Vos)
 *   - 15 Dutch patients with realistic risk distribution
 *   - 5 appointment types
 *   - 27 appointments (past completed/no-show/cancelled, today, future)
 *   - 2 open slots (1 claimed → recovered revenue, 1 available)
 *   - 9 weekly availability slots
 *   - 4 waitlist entries
 *   - 5 message templates
 *   - 4 invoices (paid, sent, draft, overdue)
 */
export async function seedDemoData(prisma: PrismaClient): Promise<SeedResult> {
  const start = Date.now();

  // Idempotency: bail out early if the demo practice already exists.
  // We match by slug — a stable, human-meaningful key — rather than the auto
  // UUID id. Slug is unique in the schema, so this is safe.
  const existing = await prisma.practice.findUnique({
    where: { slug: DEMO_PRACTICE_SLUG },
    select: { id: true },
  });
  if (existing) {
    return {
      alreadySeeded: true,
      counts: await countRows(prisma),
      durationMs: Date.now() - start,
    };
  }

  // ── Practice ──────────────────────────────────────────────────────────────

  const practice = await prisma.practice.create({
    data: {
      name: "Praktijk Amsterdam Centrum",
      slug: DEMO_PRACTICE_SLUG,
      phone: "+31201234567",
      email: "info@praktijk-amc.nl",
      address: "Keizersgracht 123",
      city: "Amsterdam",
      zipCode: "1015CJ",
      kvkNumber: "12345678",
      agbCode: "01-012345",
    },
  });

  // ── Users (practitioners) ─────────────────────────────────────────────────

  const drKlein = await prisma.user.create({
    data: {
      firebaseUid: "firebase-demo-uid-001",
      email: "dr.klein@praktijk-amc.nl",
      firstName: "Eva",
      lastName: "Klein",
      phone: "+31612340001",
    },
  });

  const drVos = await prisma.user.create({
    data: {
      firebaseUid: "firebase-demo-uid-002",
      email: "dr.vos@praktijk-amc.nl",
      firstName: "Mark",
      lastName: "Vos",
      phone: "+31612340002",
    },
  });

  await prisma.practiceMember.createMany({
    data: [
      { practiceId: practice.id, userId: drKlein.id, role: "OWNER" },
      { practiceId: practice.id, userId: drVos.id,   role: "PRACTITIONER" },
    ],
  });

  // ── Clients ───────────────────────────────────────────────────────────────

  const clients: { id: string }[] = [];
  for (let i = 0; i < clientData.length; i++) {
    const c = clientData[i];
    const client = await prisma.client.create({
      data: {
        practiceId: practice.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        dateOfBirth: new Date(c.dob),
        city: c.city,
        zipCode: c.zip,
        riskLevel: riskLevels[i],
        notes:
          i === 14 ? "Vereist directe follow-up na laatste sessie." :
          i === 12 ? "Geschiedenis van angststoornis. Voorkeur ochtendafspraken." :
          i === 13 ? "Mobiliteitsproblemen — alleen begane grond." :
          null,
        isActive: i < 14, // last one is inactive for realism
      },
    });
    clients.push({ id: client.id });
  }

  // ── Appointment types ─────────────────────────────────────────────────────

  const types = await Promise.all([
    prisma.appointmentType.create({
      data: { practiceId: practice.id, name: "Intake",          durationMinutes: 60, color: "#8B5CF6", price: 9500  },
    }),
    prisma.appointmentType.create({
      data: { practiceId: practice.id, name: "Follow-up",       durationMinutes: 45, color: "#3B82F6", price: 7500  },
    }),
    prisma.appointmentType.create({
      data: { practiceId: practice.id, name: "Assessment",      durationMinutes: 90, color: "#F59E0B", price: 12500 },
    }),
    prisma.appointmentType.create({
      data: { practiceId: practice.id, name: "Crisis session",  durationMinutes: 30, color: "#EF4444", price: 6000  },
    }),
    prisma.appointmentType.create({
      data: { practiceId: practice.id, name: "Group therapy",   durationMinutes: 90, color: "#10B981", price: 4500  },
    }),
  ]);
  const [intake, followUp, assessment, crisis, group] = types;

  // ── Appointments ──────────────────────────────────────────────────────────

  const riskMap: Record<string, { riskScore: number; riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }> = {
    LOW:      { riskScore: 15, riskLevel: "LOW" },
    MEDIUM:   { riskScore: 42, riskLevel: "MEDIUM" },
    HIGH:     { riskScore: 68, riskLevel: "HIGH" },
    CRITICAL: { riskScore: 87, riskLevel: "CRITICAL" },
  };

  type Status = "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  interface ApptSeed {
    clientIdx:    number;
    practitioner: { id: string };
    type:         { id: string; durationMinutes: number; price: number };
    dayOffset:    number;
    hour:         number;
    status:       Status;
  }

  const appointmentSeeds: ApptSeed[] = [
    // Past — completed / no-show / cancelled
    { clientIdx:  0, practitioner: drKlein, type: intake,     dayOffset: -14, hour:  9, status: "COMPLETED" },
    { clientIdx:  1, practitioner: drKlein, type: intake,     dayOffset: -12, hour: 10, status: "COMPLETED" },
    { clientIdx:  2, practitioner: drVos,   type: intake,     dayOffset: -10, hour:  9, status: "COMPLETED" },
    { clientIdx:  3, practitioner: drVos,   type: intake,     dayOffset:  -9, hour: 11, status: "COMPLETED" },
    { clientIdx:  4, practitioner: drKlein, type: intake,     dayOffset:  -8, hour: 14, status: "COMPLETED" },
    { clientIdx:  0, practitioner: drKlein, type: followUp,   dayOffset:  -7, hour:  9, status: "COMPLETED" },
    { clientIdx:  5, practitioner: drVos,   type: intake,     dayOffset:  -7, hour: 10, status: "COMPLETED" },
    { clientIdx:  1, practitioner: drKlein, type: followUp,   dayOffset:  -5, hour: 11, status: "NO_SHOW"   },
    { clientIdx:  6, practitioner: drVos,   type: assessment, dayOffset:  -4, hour:  9, status: "COMPLETED" },
    { clientIdx:  7, practitioner: drKlein, type: intake,     dayOffset:  -3, hour: 14, status: "CANCELLED" },
    { clientIdx:  2, practitioner: drVos,   type: followUp,   dayOffset:  -2, hour: 10, status: "COMPLETED" },
    { clientIdx:  8, practitioner: drKlein, type: intake,     dayOffset:  -1, hour:  9, status: "COMPLETED" },

    // Today
    { clientIdx:  0, practitioner: drKlein, type: followUp,   dayOffset:   0, hour:  9, status: "COMPLETED"   },
    { clientIdx:  3, practitioner: drVos,   type: followUp,   dayOffset:   0, hour: 10, status: "IN_PROGRESS" },
    { clientIdx:  9, practitioner: drKlein, type: intake,     dayOffset:   0, hour: 11, status: "CONFIRMED"   },
    { clientIdx:  4, practitioner: drVos,   type: crisis,     dayOffset:   0, hour: 14, status: "SCHEDULED"   },
    { clientIdx: 10, practitioner: drKlein, type: group,      dayOffset:   0, hour: 15, status: "SCHEDULED"   },

    // Future
    { clientIdx:  1, practitioner: drKlein, type: followUp,   dayOffset:   1, hour:  9, status: "CONFIRMED" },
    { clientIdx:  5, practitioner: drVos,   type: followUp,   dayOffset:   1, hour: 11, status: "SCHEDULED" },
    { clientIdx: 11, practitioner: drKlein, type: intake,     dayOffset:   2, hour: 10, status: "SCHEDULED" },
    { clientIdx: 12, practitioner: drVos,   type: assessment, dayOffset:   3, hour:  9, status: "SCHEDULED" },
    { clientIdx:  6, practitioner: drKlein, type: followUp,   dayOffset:   3, hour: 14, status: "CONFIRMED" },
    { clientIdx:  2, practitioner: drVos,   type: followUp,   dayOffset:   5, hour: 10, status: "SCHEDULED" },
    { clientIdx: 13, practitioner: drKlein, type: intake,     dayOffset:   7, hour:  9, status: "SCHEDULED" },
    { clientIdx: 14, practitioner: drVos,   type: crisis,     dayOffset:   7, hour: 14, status: "SCHEDULED" },

    // Cancelled-→-open-slot pipeline
    { clientIdx:  8, practitioner: drVos,   type: followUp,   dayOffset:  -5, hour: 14, status: "CANCELLED" }, // → CLAIMED slot
    { clientIdx:  5, practitioner: drKlein, type: followUp,   dayOffset:   4, hour: 10, status: "CANCELLED" }, // → AVAILABLE slot
  ];

  const apptMap = new Map<number, { id: string; startTime: Date; endTime: Date }>();
  for (let i = 0; i < appointmentSeeds.length; i++) {
    const seed = appointmentSeeds[i];
    const client = clients[seed.clientIdx];
    const startTime = dateAt(seed.dayOffset, seed.hour);
    const endTime = new Date(startTime.getTime() + seed.type.durationMinutes * 60_000);
    const risk = riskMap[riskLevels[seed.clientIdx]];

    const appt = await prisma.appointment.create({
      data: {
        practiceId:           practice.id,
        clientId:             client.id,
        practitionerId:       seed.practitioner.id,
        appointmentTypeId:    seed.type.id,
        status:               seed.status,
        startTime,
        endTime,
        revenueEstimateCents: seed.type.price,
        riskScore:            risk.riskScore,
        riskLevel:            risk.riskLevel,
        notes:
          seed.status === "NO_SHOW"   ? "Patiënt is niet verschenen. Telefonisch geprobeerd te bereiken — geen antwoord." :
          seed.status === "CANCELLED" ? "Door patiënt geannuleerd, 2 uur voor afspraak." :
          null,
      },
    });
    apptMap.set(i, { id: appt.id, startTime, endTime });
  }

  // ── Open slots (cancelled appointment recovery pipeline) ──────────────────

  // Past cancelled (idx 25) → CLAIMED — drives recovered-revenue KPI
  const pastCancelled = apptMap.get(25)!;
  await prisma.openSlot.create({
    data: {
      practiceId:            practice.id,
      sourceAppointmentId:   pastCancelled.id,
      practitionerId:        appointmentSeeds[25].practitioner.id,
      appointmentTypeId:     appointmentSeeds[25].type.id,
      startTime:             pastCancelled.startTime,
      endTime:               pastCancelled.endTime,
      durationMinutes:       appointmentSeeds[25].type.durationMinutes,
      status:                "CLAIMED",
    },
  });

  // Future cancelled (idx 26) → AVAILABLE — demo-ready for match/offer/claim
  const futureCancelled = apptMap.get(26)!;
  await prisma.openSlot.create({
    data: {
      practiceId:            practice.id,
      sourceAppointmentId:   futureCancelled.id,
      practitionerId:        appointmentSeeds[26].practitioner.id,
      appointmentTypeId:     appointmentSeeds[26].type.id,
      startTime:             futureCancelled.startTime,
      endTime:               futureCancelled.endTime,
      durationMinutes:       appointmentSeeds[26].type.durationMinutes,
      status:                "AVAILABLE",
    },
  });

  // ── Availability slots (weekly schedule) ──────────────────────────────────

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
  const slotData: Array<{
    practiceId: string; practitionerId: string;
    dayOfWeek: typeof days[number]; startTime: string; endTime: string;
  }> = [];
  for (const day of days) {
    slotData.push({ practiceId: practice.id, practitionerId: drKlein.id, dayOfWeek: day, startTime: "09:00", endTime: "17:00" });
    if (day !== "FRIDAY") {
      slotData.push({ practiceId: practice.id, practitionerId: drVos.id, dayOfWeek: day, startTime: "09:00", endTime: "15:00" });
    }
  }
  await prisma.availabilitySlot.createMany({ data: slotData });

  // ── Waitlist entries ──────────────────────────────────────────────────────

  await prisma.waitlistEntry.createMany({
    data: [
      {
        practiceId:        practice.id,
        clientId:          clients[11].id, // Bram Dijkstra
        status:            "WAITING",
        preferredDay:      "TUESDAY",
        preferredTime:     "morning",
        notes:             "Voorkeur Dr. Klein. Kan op korte termijn komen.",
      },
      {
        practiceId:        practice.id,
        clientId:          clients[12].id, // Sanne Mulder
        status:            "WAITING",
        preferredDay:      "THURSDAY",
        preferredTime:     "afternoon",
        notes:             "Alleen na 13:00 beschikbaar i.v.m. werk.",
      },
      {
        practiceId:        practice.id,
        clientId:          clients[7].id, // Daan de Groot
        appointmentTypeId: followUp.id,
        status:             "ACCEPTED",
        preferredDay:       "WEDNESDAY",
        preferredTime:      "09:00-12:00",
        notes:              "Heeft open plek geclaimd na annulering.",
      },
      {
        practiceId:        practice.id,
        clientId:          clients[10].id, // Fleur Dekker
        appointmentTypeId: followUp.id,
        status:            "WAITING",
        preferredTime:     "morning",
        notes:             "Elke dag werkt. Flexibele agenda.",
      },
    ],
  });

  // ── Message templates ─────────────────────────────────────────────────────

  await prisma.messageTemplate.createMany({
    data: [
      {
        practiceId: practice.id,
        name: "Herinnering (48 uur)",
        subject: "Herinnering: Uw afspraak over 2 dagen",
        body: "Beste {{client_name}}, over 2 dagen op {{date}} om {{time}} verwachten wij u bij {{practice_name}}. Bevestig via: {{confirm_link}} of annuleer: {{cancel_link}}",
        channel: "sms",
      },
      {
        practiceId: practice.id,
        name: "Herinnering (24 uur)",
        subject: "Herinnering: Uw afspraak morgen",
        body: "Beste {{client_name}}, morgen om {{time}} verwachten wij u bij {{practice_name}} voor uw {{appointment_type}}. Bevestig: {{confirm_link}} Tot dan!",
        channel: "sms",
      },
      {
        practiceId: practice.id,
        name: "Welkom nieuwe patiënt",
        subject: "Welkom bij onze praktijk",
        body: "Welkom bij {{practice_name}}, {{client_name}}! Wij kijken uit naar uw eerste afspraak.",
        channel: "email",
      },
      {
        practiceId: practice.id,
        name: "Bevestigingsbericht",
        subject: "Afspraak bevestigd",
        body: "Uw afspraak op {{date}} om {{time}} bij {{practice_name}} is bevestigd. Tot dan!",
        channel: "sms",
      },
      {
        practiceId: practice.id,
        name: "Annuleringsbevestiging",
        subject: "Bevestiging annulering afspraak",
        body: "Beste {{client_name}}, uw afspraak op {{date}} om {{time}} bij {{practice_name}} is geannuleerd.",
        channel: "email",
      },
    ],
  });

  // ── Invoices ──────────────────────────────────────────────────────────────

  await prisma.invoice.create({
    data: {
      practiceId: practice.id,
      clientId:   clients[0].id,
      number:     "INV-2026-0001",
      status:     "PAID",
      issueDate:  pastDate(14),
      dueDate:    pastDate(0),
      subtotal:   17000,
      taxRate:    0,
      taxAmount:  0,
      total:      17000,
      items: {
        create: [
          { description: "Intake — 60 min",    quantity: 1, unitPrice: 9500, total: 9500 },
          { description: "Follow-up — 45 min", quantity: 1, unitPrice: 7500, total: 7500 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      practiceId: practice.id,
      clientId:   clients[2].id,
      number:     "INV-2026-0002",
      status:     "SENT",
      issueDate:  pastDate(5),
      dueDate:    daysFromNow(25),
      subtotal:   22000,
      taxRate:    0,
      taxAmount:  0,
      total:      22000,
      items: {
        create: [
          { description: "Intake — 60 min",     quantity: 1, unitPrice: 9500,  total: 9500 },
          { description: "Assessment — 90 min", quantity: 1, unitPrice: 12500, total: 12500 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      practiceId: practice.id,
      clientId:   clients[4].id,
      number:     "INV-2026-0003",
      status:     "DRAFT",
      issueDate:  new Date(),
      dueDate:    daysFromNow(30),
      subtotal:   9500,
      taxRate:    0,
      taxAmount:  0,
      total:      9500,
      items: { create: [{ description: "Intake — 60 min", quantity: 1, unitPrice: 9500, total: 9500 }] },
    },
  });

  await prisma.invoice.create({
    data: {
      practiceId: practice.id,
      clientId:   clients[5].id,
      number:     "INV-2026-0004",
      status:     "OVERDUE",
      issueDate:  pastDate(45),
      dueDate:    pastDate(15),
      subtotal:   9500,
      taxRate:    0,
      taxAmount:  0,
      total:      9500,
      items: { create: [{ description: "Intake — 60 min", quantity: 1, unitPrice: 9500, total: 9500 }] },
    },
  });

  return {
    alreadySeeded: false,
    counts: await countRows(prisma),
    durationMs: Date.now() - start,
  };
}
