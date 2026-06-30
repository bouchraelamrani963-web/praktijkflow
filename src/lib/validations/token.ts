import { z } from "zod";
import { UuidSchema } from "@/lib/validations/uuid";

export const tokenActionSchema = z.enum([
  "confirm_appointment",
  "cancel_appointment",
  "claim_open_slot",
]);

export const createTokenSchema = z.object({
  appointmentId: UuidSchema.optional(),
  clientId: UuidSchema,
  action: tokenActionSchema,
  expiresInHours: z.number().int().min(1).max(720).optional(), // max 30 days
});

export const executeTokenSchema = z.object({
  token: z.string().min(1),
});
