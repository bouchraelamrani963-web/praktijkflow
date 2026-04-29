import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function todayAt(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
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

// ─── Dutch-realistic names ──────────────────────────────────────────────────

const clientData = [
  { firstName: "Sophie", lastName: "de Vries", email: "sophie.devries@email.nl", phone: "+31612345001", dob: "1985-03-14", city: "Amsterdam", zip: "1012AB" },
  { firstName: "Jan", lastName: "Bakker", email: "jan.bakker@email.nl", phone: "+31612345002", dob: "1978-07-22", city: "Rotterdam", zip: "3011AA" },
  { firstName: "Maria", lastName: "Jansen", email: "maria.jansen@email.nl", phone: "+31612345003", dob: "1992-11-05", city: "Utrecht", zip: "3511AB" },
  { firstName: "Pieter", lastName: "van den Berg", email: "pieter.vdberg@email.nl", phone: "+31612345004", dob: "1968-01-30", city: "Den Haag", zip: "2511AA" },
  { firstName: "Lisa", lastName: "Visser", email: "lisa.visser@email.nl", phone: "+31612345005", dob: "1990-06-18", city: "Amsterdam", zip: "1013BH" },
  { firstName: "Thomas", lastName: "Smit", email: "thomas.smit@email.nl", phone: "+31612345006", dob: "1975-09-02", city: "Haarlem", zip: "2011AA" },
  { firstName: "Emma", lastName: "Meijer", email: "emma.meijer@email.nl", phone: "+31612345007", dob: "1999-12-24", city: "Leiden", zip: "2311AB" },
  { firstName: "Daan", lastName: "de Groot", email: "daan.degroot@email.nl", phone: "+31612345008", dob: "1982-04-10", city: "Amsterdam", zip: "1071CJ" },
  { firstName: "Anne", lastName: "Bos", email: "anne.bos@email.nl", phone: "+31612345009", dob: "1988-08-15", city: "Amstelveen", zip: "1181AA" },
  { firstName: "Luc", lastName: "Hendriks", email: "luc.hendriks@email.nl", phone: "+31612345010", dob: "1965-02-28", city: "Hilversum", zip: "1211AB" },
  { firstName: "Fleur", lastName: "Dekker", email: "fleur.dekker@email.nl", phone: "+31612345011", dob: "1995-05-09", city: "Amsterdam", zip: "1018WB" },
  { firstName: "Bram", lastName: "Dijkstra", email: "bram.dijkstra@email.nl", phone: "+31612345012", dob: "1971-10-17", city: "Zaandam", zip: "1501AA" },
  { firstName: "Sanne", lastName: "Mulder", email: "sanne.mulder@email.nl", phone: "+31612345013", dob: "2001-01-03", city: "Diemen", zip: "1111AA" },
  { firstName: "Kees", lastName: "van Dijk", email: "kees.vandijk@email.nl", phone: "+31612345014", dob: "1958-06-25", city: "Bussum", zip: "1401AA" },
  { firstName: "Iris", lastName: "Willems", email: "iris.willems@email.nl", phone: "+31612345015", dob: "1993-03-31", city: "Amsterdam", zip: "1052AA" },
] as const;

const riskLevels = ["LOW", "LOW", "LOW", "LOW", "LOW", "LOW", "LOW", "LOW", "LOW", "MEDIUM", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "CRITICAL"] as const;

// ─── Main seed ──────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding PraktijkFlow database...\n");

  // Clean existing data (reverse dependency order)
  await prisma.actionLog.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.patientActionToken.deleteMany();
  await prisma.openSlot.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.appointmentType.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.client.deleteMany();
  await prisma.practiceMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.practice.deleteMany();
  console.log("  ✓ Cleared existing data");

  // ── Practice ────────────────────────────────────────────────────────────

  const practice = await prisma.practice.create({
    data: {
      name: "Praktijk Amsterdam Centrum",
      slug: "praktijk-amsterdam-centrum",
      phone: "+31201234567",
      email: "info@praktijk-amc.nl",
      address: "Keizersgracht 123",
      city: "Amsterdam",
      zipCode: "1015CJ",
      kvkNumber: "12345678",
      agbCode: "01-012345",
    },
  });
  console.log("  ✓ Created practice:", practice.name);

  // ── Users (practitioners) ───────────────────────────────────────────────

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
  console.log("  ✓ Created 2 practitioners: Dr. Klein, Dr. Vos");

  // ── Practice members ────────────────────────────────────────────────────

  await prisma.practiceMember.createMany({
    data: [
      { practiceId: practice.id, userId: drKlein.id, role: "OWNER" },
      { practiceId: practice.id, userId: drVos.id, role: "PRACTITIONER" },
    ],
  });
  console.log("  ✓ Linked users to practice");

  // ── Clients ─────────────────────────────────────────────────────────────

  const clients = [];
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
        notes: i === 14 ? "Urgent: requires immediate follow-up after last session." : i === 12 ? "History of anxiety. Prefers morning appointments." : i === 13 ? "Mobility issues — ground floor room only." : null,
        isActive: i < 14, // last one is inactive for realism
      },
    });
    clients.push(client);
  }
  console.log(`  ✓ Created ${clients.length} clients`);

  // ── Appointment types ───────────────────────────────────────────────────

  const types = await Promise.all([
    prisma.appointmentType.create({
      data: { practiceId: practice.id, name: "Intake", durationMinutes: 60, color: "#8B5CF6", price: 9500 },
    }),
    prisma.appointmentType.create({
      data: { practiceId: practice.id, name: "Follow-up", durationMinutes: 45, color: "#3B82F6", price: 7500 },
    }),
    prisma.appointmentType.create({
      data: { practiceId: practice.id, name: "Assessment", durationMinutes: 90, color: "#F59E0B", price: 12500 },
    }),
    prisma.appointmentType.create({
      data: { practiceId: practice.id, name: "Crisis session", durationMinutes: 30, color: "#EF4444", price: 6000 },
    }),
    prisma.appointmentType.create({
      data: { practiceId: practice.id, name: "Group therapy", durationMinutes: 90, color: "#10B981", price: 4500 },
    }),
  ]);
  const [intake, followUp, assessment, crisis, group] = types;
  console.log(`  ✓ Created ${types.length} appointment types`);

  // ── Appointments (25 total: past, today, future, mixed statuses) ───────

  const practitioners = [drKlein, drVos];

  // Risk scores per client risk level (for realistic dashboard)
  const riskMap: Record<string, { riskScore: number; riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }> = {
    LOW: { riskScore: 15, riskLevel: "LOW" },
    MEDIUM: { riskScore: 42, riskLevel: "MEDIUM" },
    HIGH: { riskScore: 68, riskLevel: "HIGH" },
    CRITICAL: { riskScore: 87, riskLevel: "CRITICAL" },
  };

  interface ApptSeed {
    clientIdx: number;
    practitioner: typeof drKlein;
    type: typeof intake;
    dayOffset: number;
    hour: number;
    status: "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  }

  const appointmentSeeds: ApptSeed[] = [
    // ── Past (completed / no-show / cancelled) ──
    { clientIdx: 0, practitioner: drKlein, type: intake,    dayOffset: -14, hour: 9,  status: "COMPLETED" },
    { clientIdx: 1, practitioner: drKlein, type: intake,    dayOffset: -12, hour: 10, status: "COMPLETED" },
    { clientIdx: 2, practitioner: drVos,   type: intake,    dayOffset: -10, hour: 9,  status: "COMPLETED" },
    { clientIdx: 3, practitioner: drVos,   type: intake,    dayOffset: -9,  hour: 11, status: "COMPLETED" },
    { clientIdx: 4, practitioner: drKlein, type: intake,    dayOffset: -8,  hour: 14, status: "COMPLETED" },
    { clientIdx: 0, practitioner: drKlein, type: followUp,  dayOffset: -7,  hour: 9,  status: "COMPLETED" },
    { clientIdx: 5, practitioner: drVos,   type: intake,    dayOffset: -7,  hour: 10, status: "COMPLETED" },
    { clientIdx: 1, practitioner: drKlein, type: followUp,  dayOffset: -5,  hour: 11, status: "NO_SHOW" },
    { clientIdx: 6, practitioner: drVos,   type: assessment,dayOffset: -4,  hour: 9,  status: "COMPLETED" },
    { clientIdx: 7, practitioner: drKlein, type: intake,    dayOffset: -3,  hour: 14, status: "CANCELLED" },
    { clientIdx: 2, practitioner: drVos,   type: followUp,  dayOffset: -2,  hour: 10, status: "COMPLETED" },
    { clientIdx: 8, practitioner: drKlein, type: intake,    dayOffset: -1,  hour: 9,  status: "COMPLETED" },

    // ── Today ──
    { clientIdx: 0, practitioner: drKlein, type: followUp,  dayOffset: 0,   hour: 9,  status: "COMPLETED" },
    { clientIdx: 3, practitioner: drVos,   type: followUp,  dayOffset: 0,   hour: 10, status: "IN_PROGRESS" },
    { clientIdx: 9, practitioner: drKlein, type: intake,    dayOffset: 0,   hour: 11, status: "CONFIRMED" },
    { clientIdx: 4, practitioner: drVos,   type: crisis,    dayOffset: 0,   hour: 14, status: "SCHEDULED" },
    { clientIdx: 10,practitioner: drKlein, type: group,     dayOffset: 0,   hour: 15, status: "SCHEDULED" },

    // ── Future ──
    { clientIdx: 1, practitioner: drKlein, type: followUp,  dayOffset: 1,   hour: 9,  status: "CONFIRMED" },
    { clientIdx: 5, practitioner: drVos,   type: followUp,  dayOffset: 1,   hour: 11, status: "SCHEDULED" },
    { clientIdx: 11,practitioner: drKlein, type: intake,    dayOffset: 2,   hour: 10, status: "SCHEDULED" },
    { clientIdx: 12,practitioner: drVos,   type: assessment,dayOffset: 3,   hour: 9,  status: "SCHEDULED" },
    { clientIdx: 6, practitioner: drKlein, type: followUp,  dayOffset: 3,   hour: 14, status: "CONFIRMED" },
    { clientIdx: 2, practitioner: drVos,   type: followUp,  dayOffset: 5,   hour: 10, status: "SCHEDULED" },
    { clientIdx: 13,practitioner: drKlein, type: intake,    dayOffset: 7,   hour: 9,  status: "SCHEDULED" },
    { clientIdx: 14,practitioner: drVos,   type: crisis,    dayOffset: 7,   hour: 14, status: "SCHEDULED" },

    // ── Demo flow: cancelled → open slot pipeline ──
    { clientIdx: 8, practitioner: drVos,   type: followUp,  dayOffset: -5,  hour: 14, status: "CANCELLED" }, // → CLAIMED open slot (recovered revenue)
    { clientIdx: 5, practitioner: drKlein, type: followUp,  dayOffset: 4,   hour: 10, status: "CANCELLED" }, // → AVAILABLE open slot (demo-ready)
  ];

  const apptMap = new Map<number, { id: string; startTime: Date; endTime: Date }>();
  for (let i = 0; i < appointmentSeeds.length; i++) {
    const seed = appointmentSeeds[i];
    const client = clients[seed.clientIdx];
    const start = dateAt(seed.dayOffset, seed.hour);
    const end = new Date(start.getTime() + seed.type.durationMinutes * 60_000);
    const risk = riskMap[riskLevels[seed.clientIdx]];

    const appt = await prisma.appointment.create({
      data: {
        practiceId: practice.id,
        clientId: client.id,
        practitionerId: seed.practitioner.id,
        appointmentTypeId: seed.type.id,
        status: seed.status,
        startTime: start,
        endTime: end,
        revenueEstimateCents: seed.type.price,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        notes: seed.status === "NO_SHOW" ? "Patient did not show up. Attempted phone call — no answer." : seed.status === "CANCELLED" ? "Cancelled by patient 2 hours before appointment." : null,
      },
    });
    apptMap.set(i, { id: appt.id, startTime: start, endTime: end });
  }
  console.log(`  ✓ Created ${appointmentSeeds.length} appointments`);

  // ── Open slots (cancelled appointment recovery pipeline) ────────────────

  // Past cancelled (index 25) → CLAIMED = recovered revenue on dashboard
  const pastCancelled = apptMap.get(25)!;
  await prisma.openSlot.create({
    data: {
      practiceId: practice.id,
      sourceAppointmentId: pastCancelled.id,
      practitionerId: appointmentSeeds[25].practitioner.id,
      appointmentTypeId: appointmentSeeds[25].type.id,
      startTime: pastCancelled.startTime,
      endTime: pastCancelled.endTime,
      durationMinutes: appointmentSeeds[25].type.durationMinutes,
      status: "CLAIMED",
    },
  });

  // Future cancelled (index 26) → AVAILABLE = demo-ready for match/offer/claim
  const futureCancelled = apptMap.get(26)!;
  await prisma.openSlot.create({
    data: {
      practiceId: practice.id,
      sourceAppointmentId: futureCancelled.id,
      practitionerId: appointmentSeeds[26].practitioner.id,
      appointmentTypeId: appointmentSeeds[26].type.id,
      startTime: futureCancelled.startTime,
      endTime: futureCancelled.endTime,
      durationMinutes: appointmentSeeds[26].type.durationMinutes,
      status: "AVAILABLE",
    },
  });
  console.log("  ✓ Created 2 open slots (1 claimed, 1 available)");

  // ── Availability slots (weekly schedule) ────────────────────────────────

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;

  const slotData = [];
  for (const day of days) {
    // Dr. Klein: Mon–Fri 09:00–17:00
    slotData.push({ practiceId: practice.id, practitionerId: drKlein.id, dayOfWeek: day, startTime: "09:00", endTime: "17:00" });
    // Dr. Vos: Mon–Thu 09:00–15:00 (part-time Fridays off)
    if (day !== "FRIDAY") {
      slotData.push({ practiceId: practice.id, practitionerId: drVos.id, dayOfWeek: day, startTime: "09:00", endTime: "15:00" });
    }
  }
  await prisma.availabilitySlot.createMany({ data: slotData });
  console.log(`  ✓ Created ${slotData.length} availability slots`);

  // ── Waitlist entries ────────────────────────────────────────────────────

  await prisma.waitlistEntry.createMany({
    data: [
      {
        practiceId: practice.id,
        clientId: clients[11].id, // Bram Dijkstra
        status: "WAITING",
        preferredDay: "TUESDAY",
        preferredTime: "morning",
        notes: "Prefers Dr. Klein. Can come on short notice.",
      },
      {
        practiceId: practice.id,
        clientId: clients[12].id, // Sanne Mulder
        status: "WAITING",
        preferredDay: "THURSDAY",
        preferredTime: "afternoon",
        notes: "Only available after 13:00 due to work schedule.",
      },
      {
        practiceId: practice.id,
        clientId: clients[7].id, // Daan de Groot
        appointmentTypeId: followUp.id,
        status: "ACCEPTED",
        preferredDay: "WEDNESDAY",
        preferredTime: "09:00-12:00",
        notes: "Claimed open slot from cancelled appointment.",
      },
      {
        practiceId: practice.id,
        clientId: clients[10].id, // Fleur Dekker
        appointmentTypeId: followUp.id,
        status: "WAITING",
        preferredTime: "morning",
        notes: "Any day works. Flexible schedule.",
      },
    ],
  });
  console.log("  ✓ Created 4 waitlist entries (2 waiting, 1 accepted, 1 waiting with type)");

  // ── Message templates ───────────────────────────────────────────────────

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
        name: "Welkom nieuwe cliënt",
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
  console.log("  ✓ Created 5 message templates");

  // ── Invoices ────────────────────────────────────────────────────────────

  // Invoice 1: Paid
  const inv1 = await prisma.invoice.create({
    data: {
      practiceId: practice.id,
      clientId: clients[0].id,
      number: "INV-2026-0001",
      status: "PAID",
      issueDate: pastDate(14),
      dueDate: pastDate(0),
      subtotal: 17000, // intake (9500) + follow-up (7500)
      taxRate: 0, // healthcare exempt from BTW
      taxAmount: 0,
      total: 17000,
      items: {
        create: [
          { description: "Intake — 60 min (14 mrt)", quantity: 1, unitPrice: 9500, total: 9500 },
          { description: "Follow-up — 45 min (21 mrt)", quantity: 1, unitPrice: 7500, total: 7500 },
        ],
      },
    },
  });

  // Invoice 2: Sent (awaiting payment)
  const inv2 = await prisma.invoice.create({
    data: {
      practiceId: practice.id,
      clientId: clients[2].id,
      number: "INV-2026-0002",
      status: "SENT",
      issueDate: pastDate(5),
      dueDate: daysFromNow(25),
      subtotal: 22000, // intake + assessment
      taxRate: 0,
      taxAmount: 0,
      total: 22000,
      items: {
        create: [
          { description: "Intake — 60 min (26 mrt)", quantity: 1, unitPrice: 9500, total: 9500 },
          { description: "Assessment — 90 min (1 apr)", quantity: 1, unitPrice: 12500, total: 12500 },
        ],
      },
    },
  });

  // Invoice 3: Draft
  const inv3 = await prisma.invoice.create({
    data: {
      practiceId: practice.id,
      clientId: clients[4].id,
      number: "INV-2026-0003",
      status: "DRAFT",
      issueDate: new Date(),
      dueDate: daysFromNow(30),
      subtotal: 9500,
      taxRate: 0,
      taxAmount: 0,
      total: 9500,
      items: {
        create: [
          { description: "Intake — 60 min (28 mrt)", quantity: 1, unitPrice: 9500, total: 9500 },
        ],
      },
    },
  });

  // Invoice 4: Overdue
  const inv4 = await prisma.invoice.create({
    data: {
      practiceId: practice.id,
      clientId: clients[5].id,
      number: "INV-2026-0004",
      status: "OVERDUE",
      issueDate: pastDate(45),
      dueDate: pastDate(15),
      subtotal: 9500,
      taxRate: 0,
      taxAmount: 0,
      total: 9500,
      items: {
        create: [
          { description: "Intake — 60 min (19 feb)", quantity: 1, unitPrice: 9500, total: 9500 },
        ],
      },
    },
  });

  console.log("  ✓ Created 4 invoices with line items");

  // Suppress unused variable warnings
  void inv1; void inv2; void inv3; void inv4;

  // ── Summary ─────────────────────────────────────────────────────────────

  const counts = {
    practices: await prisma.practice.count(),
    users: await prisma.user.count(),
    clients: await prisma.client.count(),
    appointments: await prisma.appointment.count(),
    openSlots: await prisma.openSlot.count(),
    appointmentTypes: await prisma.appointmentType.count(),
    availabilitySlots: await prisma.availabilitySlot.count(),
    waitlistEntries: await prisma.waitlistEntry.count(),
    messageTemplates: await prisma.messageTemplate.count(),
    invoices: await prisma.invoice.count(),
    invoiceItems: await prisma.invoiceItem.count(),
  };

  console.log("\n🎉 Seed complete! Summary:");
  for (const [model, count] of Object.entries(counts)) {
    console.log(`   ${model}: ${count}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
