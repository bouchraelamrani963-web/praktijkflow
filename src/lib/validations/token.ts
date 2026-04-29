import { z } from "zod";

export const tokenActionSchema = z.enum([
  "confirm_appointment",
  "cancel_appointment",
  "claim_open_slot",
]);

export const createTokenSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  action: tokenActionSchema,
  expiresInHours: z.number().int().min(1).max(720).optional(), // max 30 days
});

export const executeTokenSchema = z.object({
  token: z.string().min(1),
});
