import { z } from "zod";

const isoDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const uuid = z.string().uuid();

export const OpenSlotStatusSchema = z.enum(["AVAILABLE", "CLAIMED", "EXPIRED"]);

// Manual mutations (admin PATCH) may only transition between AVAILABLE and
// EXPIRED. CLAIMED must ONLY come from the atomic claim transaction, which
// populates all five audit snapshot fields in the same write. Allowing
// manual CLAIMED here would create orphan slots (status=CLAIMED without
// claimedAppointmentId), which is exactly what Task 1 eliminates.
export const OpenSlotManualStatusSchema = z.enum(["AVAILABLE", "EXPIRED"]);

export const openSlotCreateSchema = z.object({
  practitionerId: uuid,
  appointmentTypeId: uuid.optional(),
  startTime: isoDate,
  endTime: isoDate.optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  notes: z.string().max(2000).optional(),
}).refine((d) => d.endTime || d.durationMinutes, {
  message: "Provide endTime or durationMinutes",
  path: ["durationMinutes"],
});

export const openSlotUpdateSchema = z.object({
  status: OpenSlotManualStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const openSlotQuerySchema = z.object({
  status: OpenSlotStatusSchema.optional(),
  practitionerId: uuid.optional(),
  dateFrom: z
    .string()
    .optional()
    .transform((s) => (s && !Number.isNaN(Date.parse(s)) ? new Date(s) : undefined)),
  dateTo: z
    .string()
    .optional()
    .transform((s) => (s && !Number.isNaN(Date.parse(s)) ? new Date(s) : undefined)),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(1, parseInt(v, 10) || 1) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) || 50 : 50;
      return Math.min(200, Math.max(1, n));
    }),
});
