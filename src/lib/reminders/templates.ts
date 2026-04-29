import { prisma } from "@/lib/db";

export interface TemplateContext {
  clientName: string;
  date: string;
  time: string;
  practiceName: string;
  appointmentType: string;
  riskLevel: string;
  confirmLink?: string;
  cancelLink?: string;
}

const DEFAULTS: Record<string, string> = {
  reminder_48h:
    "Beste {{client_name}}, u heeft een afspraak op {{date}} om {{time}} bij {{practice_name}}. Bevestig: {{confirm_link}} of annuleer: {{cancel_link}}",
  reminder_24h:
    "Beste {{client_name}}, morgen om {{time}} verwachten wij u bij {{practice_name}} voor uw {{appointment_type}} afspraak. Bevestig: {{confirm_link}} Tot dan!",
};

function interpolate(template: string, ctx: TemplateContext): string {
  return template
    .replace(/\{\{client_name\}\}/g, ctx.clientName)
    .replace(/\{\{date\}\}/g, ctx.date)
    .replace(/\{\{time\}\}/g, ctx.time)
    .replace(/\{\{practice_name\}\}/g, ctx.practiceName)
    .replace(/\{\{appointment_type\}\}/g, ctx.appointmentType)
    .replace(/\{\{risk_level\}\}/g, ctx.riskLevel)
    .replace(/\{\{confirm_link\}\}/g, ctx.confirmLink ?? "")
    .replace(/\{\{cancel_link\}\}/g, ctx.cancelLink ?? "");
}

/**
 * Resolve the SMS body for a given reminder type.
 * Loads from DB if a matching active template exists, else falls back to default.
 */
export async function resolveTemplate(
  practiceId: string,
  reminderType: "48h" | "24h",
  ctx: TemplateContext,
): Promise<string> {
  const templateName = `reminder_${reminderType}`;

  const dbTemplate = await prisma.messageTemplate.findFirst({
    where: {
      practiceId,
      name: templateName,
      channel: "sms",
      isActive: true,
    },
    select: { body: true },
  });

  const raw = dbTemplate?.body ?? DEFAULTS[templateName] ?? DEFAULTS.reminder_48h;
  return interpolate(raw, ctx);
}
