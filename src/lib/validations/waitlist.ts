import { z } from "zod";

const uuid = z.string().uuid();

export const DayOfWeekSchema = z.enum([
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
]);

export const WaitlistStatusSchema = z.enum([
  "WAITING", "OFFERED", "ACCEPTED", "EXPIRED", "CANCELLED",
]);

export const waitlistCreateSchema = z.object({
  clientId: uuid,
  appointmentTypeId: uuid.optional(),
  preferredDay: DayOfWeekSchema.optional(),
  preferredTime: z.string().max(50).optional(),
  isFlexible: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export const waitlistUpdateSchema = z.object({
  appointmentTypeId: uuid.nullable().optional(),
  preferredDay: DayOfWeekSchema.nullable().optional(),
  preferredTime: z.string().max(50).nullable().optional(),
  isFlexible: z.boolean().optional(),
  status: WaitlistStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const waitlistQuerySchema = z.object({
  status: WaitlistStatusSchema.optional(),
  clientId: uuid.optional(),
  appointmentTypeId: uuid.optional(),
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
