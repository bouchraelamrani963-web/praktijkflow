import { z } from "zod";

export const RiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const CommunicationPreferenceSchema = z.enum(["EMAIL", "SMS", "PHONE", "NONE"]);

const optionalTrimmed = z
  .string()
  .trim()
  .max(255)
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalEmail = z
  .string()
  .trim()
  .email("Invalid email address")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+\d\s()-]*$/, "Invalid phone number")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalDate = z
  .string()
  .trim()
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), { message: "Invalid date" })
  .transform((v) => (v ? new Date(v) : undefined))
  .optional();

const optionalBsn = z
  .string()
  .trim()
  .regex(/^\d{8,9}$/, "BSN must be 8–9 digits")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const patientCreateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: optionalEmail,
  phone: optionalPhone,
  dateOfBirth: optionalDate,
  bsn: optionalBsn,
  address: optionalTrimmed,
  city: optionalTrimmed,
  zipCode: optionalTrimmed,
  riskLevel: RiskLevelSchema.default("LOW"),
  notes: z.string().trim().max(5000).optional().or(z.literal("").transform(() => undefined)),
  isActive: z.boolean().default(true),
  waitlistOptIn: z.boolean().default(false),
  communicationPreference: CommunicationPreferenceSchema.default("EMAIL"),
});

export const patientUpdateSchema = patientCreateSchema.partial();

export const patientQuerySchema = z.object({
  q: z.string().trim().optional(),
  riskLevel: RiskLevelSchema.optional(),
  isActive: z
    .enum(["true", "false", "all"])
    .optional()
    .transform((v) => (v === "all" || v === undefined ? undefined : v === "true")),
  waitlistOptIn: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(1, parseInt(v, 10) || 1) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) || 25 : 25;
      return Math.min(100, Math.max(1, n));
    }),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;
export type PatientQueryInput = z.infer<typeof patientQuerySchema>;
