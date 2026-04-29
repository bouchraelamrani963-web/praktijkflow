import { z } from "zod";

export const reminderSendSchema = z.object({
  type: z.enum(["48h", "24h"]),
});

export const reminderBatchSchema = z.object({
  type: z.enum(["48h", "24h"]),
});
