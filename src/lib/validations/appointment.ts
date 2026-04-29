import { z } from "zod";

export const AppointmentStatusSchema = z.enum([
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const RiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const isoDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const optionalIsoDate = z
  .string()
  .optional()
  .refine((s) => !s || !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const uuid = z.string().uuid();

export const appointmentCreateSchema = z
  .object({
    clientId: uuid,
    practitionerId: uuid,
    appointmentTypeId: uuid.optional(),
    startTime: isoDate,
    endTime: optionalIsoDate,
    durationMinutes: z.number().int().min(5).max(480).optional(),
    status: AppointmentStatusSchema.default("SCHEDULED"),
    notes: z
      .string()
      .max(5000)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    revenueEstimateCents: z.number().int().min(0).max(10_000_00).optional(),
  })
  .refine((d) => d.endTime || d.durationMinutes || d.appointmentTypeId, {
    message: "Provide endTime, durationMinutes, or appointmentTypeId",
    path: ["durationMinutes"],
  });

export const appointmentUpdateSchema = z.object({
  clientId: uuid.optional(),
  practitionerId: uuid.optional(),
  appointmentTypeId: uuid.nullable().optional(),
  startTime: isoDate.optional(),
  endTime: isoDate.optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  status: AppointmentStatusSchema.optional(),
  notes: z
    .string()
    .max(5000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  revenueEstimateCents: z.number().int().min(0).max(10_000_00).optional(),
});

export const appointmentStatusSchema = z.object({
  status: AppointmentStatusSchema,
});

export const appointmentQuerySchema = z.object({
  dateFrom: z
    .string()
    .optional()
    .transform((s) => (s && !Number.isNaN(Date.parse(s)) ? new Date(s) : undefined)),
  dateTo: z
    .string()
    .optional()
    .transform((s) => (s && !Number.isNaN(Date.parse(s)) ? new Date(s) : undefined)),
  status: AppointmentStatusSchema.optional(),
  riskLevel: RiskLevelSchema.optional(),
  practitionerId: uuid.optional(),
  clientId: uuid.optional(),
  claimed: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : undefined)),
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

export const appointmentCsvRowSchema = z.object({
  client_email: z.string().trim().email(),
  practitioner_email: z.string().trim().email(),
  type_name: z.string().trim().optional(),
  start_iso: isoDate,
  duration_minutes: z.coerce.number().int().min(5).max(480).optional(),
  status: AppointmentStatusSchema.optional(),
  revenue_cents: z.coerce.number().int().min(0).max(10_000_00).optional(),
  notes: z.string().optional(),
});

export const appointmentImportSchema = z.object({
  csv: z.string().min(1, "CSV is empty"),
});

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;
export type AppointmentQueryInput = z.infer<typeof appointmentQuerySchema>;
export type AppointmentCsvRow = z.infer<typeof appointmentCsvRowSchema>;
