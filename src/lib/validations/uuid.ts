import { z } from "zod";

export const UuidSchema = z.string().uuid();

export function isUuid(value: unknown): value is string {
  return UuidSchema.safeParse(value).success;
}
