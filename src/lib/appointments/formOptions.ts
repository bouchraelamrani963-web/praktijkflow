import { prisma } from "@/lib/db";

export async function loadAppointmentFormOptions(practiceId: string) {
  const [clients, practitioners, types] = await Promise.all([
    prisma.client.findMany({
      where: { practiceId, isActive: true },
      select: { id: true, firstName: true, lastName: true, riskLevel: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.user.findMany({
      where: { memberships: { some: { practiceId, isActive: true } } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }],
    }),
    prisma.appointmentType.findMany({
      where: { practiceId, isActive: true },
      select: { id: true, name: true, durationMinutes: true, price: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { clients, practitioners, types };
}
