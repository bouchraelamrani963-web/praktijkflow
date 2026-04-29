import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { appointmentQuerySchema } from "@/lib/validations/appointment";
import { AppointmentsList } from "@/components/appointments/AppointmentsList";

async function buildClaimedWhere(
  practiceId: string,
): Promise<Prisma.AppointmentWhereInput | null> {
  const claimedSlots = await prisma.openSlot.findMany({
    where: { practiceId, status: "CLAIMED" },
    select: { startTime: true, practitionerId: true, sourceAppointmentId: true },
  });
  if (claimedSlots.length === 0) return null;
  const excludeIds = claimedSlots
    .filter((s) => s.sourceAppointmentId)
    .map((s) => s.sourceAppointmentId!);
  const slotConditions = claimedSlots.map((s) => ({
    startTime: s.startTime,
    practitionerId: s.practitionerId,
  }));
  return {
    ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
    OR: slotConditions,
  };
}

// Next.js 16: searchParams is a Promise that must be awaited.
type PageSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const sp = await searchParams;

  // Normalize arrays → first element (e.g. ?status=A&status=B → "A")
  const raw = {
    status:   Array.isArray(sp.status)   ? sp.status[0]   : sp.status,
    dateFrom: Array.isArray(sp.dateFrom) ? sp.dateFrom[0] : sp.dateFrom,
    dateTo:   Array.isArray(sp.dateTo)   ? sp.dateTo[0]   : sp.dateTo,
    claimed:  Array.isArray(sp.claimed)  ? sp.claimed[0]  : sp.claimed,
  };

  // Reuse the same Zod schema the API route uses for consistent date parsing.
  // On parse failure fall back to "show all" defaults — same shape as the success branch.
  const parsed = appointmentQuerySchema.safeParse(raw);
  const filters = parsed.success
    ? parsed.data
    : {
        page: 1 as const,
        pageSize: 50 as const,
        status: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        riskLevel: undefined,
        practitionerId: undefined,
        clientId: undefined,
        claimed: undefined,
      };

  const { status, dateFrom, claimed } = filters;
  let { dateTo } = filters;

  // When dateTo comes from a KPI card it's a date-only string (YYYY-MM-DD, 10 chars).
  // Extend it to end-of-UTC-day so the full day is included — matching client behaviour.
  if (dateTo && raw.dateTo?.length === 10) {
    dateTo = new Date(`${raw.dateTo}T23:59:59.999Z`);
  }

  const page     = filters.page     ?? 1;
  const pageSize = filters.pageSize ?? 50;

  // When claimed=true, pre-fetch CLAIMED open slots to build the matching condition.
  const claimedWhere = claimed ? await buildClaimedWhere(user.practiceId) : null;

  // No claimed slots in DB → return empty list immediately.
  if (claimed && claimedWhere === null) {
    const practitioners = await prisma.user.findMany({
      where:   { memberships: { some: { practiceId: user.practiceId, isActive: true } } },
      select:  { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }],
    });
    return (
      <AppointmentsList
        practitioners={practitioners}
        initialData={{ items: [], total: 0, page, pageSize }}
      />
    );
  }

  let where: Prisma.AppointmentWhereInput = {
    practiceId: user.practiceId,
    ...(status   && { status }),
    ...((dateFrom || dateTo) && {
      startTime: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo   && { lte: dateTo }),
      },
    }),
    ...(claimedWhere ?? {}),
  };

  const [total, rows, practitioners] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { startTime: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client:          { select: { id: true, firstName: true, lastName: true, riskLevel: true } },
        practitioner:    { select: { id: true, firstName: true, lastName: true } },
        appointmentType: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.user.findMany({
      where:   { memberships: { some: { practiceId: user.practiceId, isActive: true } } },
      select:  { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }],
    }),
  ]);

  // Serialize Prisma Date objects → ISO strings so they match the AppointmentRow interface.
  const items = rows.map((a) => ({
    id:                   a.id,
    startTime:            a.startTime.toISOString(),
    endTime:              a.endTime.toISOString(),
    status:               a.status,
    revenueEstimateCents: a.revenueEstimateCents,
    riskScore:            a.riskScore,
    riskLevel:            a.riskLevel,
    client:               a.client,
    practitioner:         a.practitioner,
    appointmentType:      a.appointmentType ?? null,
  }));

  return (
    <AppointmentsList
      practitioners={practitioners}
      initialData={{ items, total, page, pageSize }}
    />
  );
}
