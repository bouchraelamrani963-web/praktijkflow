import { prisma, safeQuery } from "@/lib/db";

/**
 * Loader for the dropdown options on the create/edit appointment form.
 *
 * Wrapped in safeQuery so a missing DATABASE_URL or unreachable DB doesn't
 * crash the form page — the form still renders with empty selects, and
 * the user sees an empty-state hint per dropdown rather than a Vercel
 * 500. This matters specifically for /appointments/new which is reached
 * from the empty-state CTA on the appointments list.
 */
export type AppointmentFormOptions = {
  clients:       Array<{ id: string; firstName: string; lastName: string; riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }>;
  practitioners: Array<{ id: string; firstName: string; lastName: string }>;
  types:         Array<{ id: string; name: string; durationMinutes: number; price: number }>;
};

const EMPTY_OPTIONS: AppointmentFormOptions = {
  clients:       [],
  practitioners: [],
  types:         [],
};

export async function loadAppointmentFormOptions(practiceId: string): Promise<AppointmentFormOptions> {
  return safeQuery<AppointmentFormOptions>(
    "appointments.formOptions",
    async () => {
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
    },
    EMPTY_OPTIONS,
  );
}
