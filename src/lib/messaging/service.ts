import { normalizeEmailAddress, maskEmailAddress, maskEmailAddressesInText } from "@/lib/email";
import { normalizePhoneNumber } from "@/lib/phone";
import {
  sendSms,
  isSmsAllowed,
  isSmsTestMode,
} from "@/lib/twilio";
import { extractActionPath } from "@/lib/url";

export type MessageChannel = "email" | "sms";

export interface MessageResult {
  success: boolean;
  mock: boolean;
  channel: MessageChannel;
  sid?: string;
  error?: string;
}

interface OfferMessageInput {
  channel?: MessageChannel;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";

function getEmailConfig() {
  const provider = (process.env.EMAIL_PROVIDER ?? "resend").trim().toLowerCase();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return { provider, apiKey, from, replyTo, appUrl };
}

export function isEmailTestMode(): boolean {
  return process.env.EMAIL_TEST_MODE?.trim().toLowerCase() !== "false";
}

export function isEmailConfigured(): boolean {
  const { provider, apiKey, from, appUrl } = getEmailConfig();
  return provider === "resend" && Boolean(apiKey && from && appUrl);
}

export function isRealEmailEnabled(): boolean {
  return !isEmailTestMode() && isEmailConfigured();
}

export function isOfferMessageTestMode(channel: MessageChannel = "email"): boolean {
  return channel === "email" ? isEmailTestMode() : isSmsTestMode();
}

export function isOfferMessageAllowed(channel: MessageChannel = "email"): boolean {
  if (channel === "email") {
    return isEmailTestMode() || isRealEmailEnabled();
  }
  return isSmsAllowed();
}

function safeEmailLog(label: string, to: string, text: string) {
  const actionPath = extractActionPath(text);
  if (process.env.NODE_ENV === "production") {
    console.log(`${label} To: ${maskEmailAddress(to)}${actionPath ? " | Action link generated" : ""}`);
    return;
  }

  console.log(`${label} To: ${maskEmailAddress(to)}${actionPath ? ` | Action: ${actionPath}` : ""}`);
}

function sanitizeEmailProviderError(message: unknown): string {
  const raw = typeof message === "string" && message.trim()
    ? message
    : "E-mailprovider fout";
  return maskEmailAddressesInText(raw);
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<MessageResult> {
  const email = normalizeEmailAddress(to);
  if (!email.isValid || !email.normalized) {
    return { success: false, mock: false, channel: "email", error: email.reason ?? "Geen geldig e-mailadres" };
  }

  if (isEmailTestMode()) {
    safeEmailLog("[EMAIL TEST MODE]", email.normalized, text);
    return { success: true, mock: true, channel: "email", sid: `EMAIL_TEST_${Date.now()}` };
  }

  const { apiKey, from, replyTo } = getEmailConfig();
  if (!isRealEmailEnabled() || !apiKey || !from) {
    return { success: false, mock: false, channel: "email", error: "E-mailprovider niet geconfigureerd" };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email.normalized],
        subject,
        text,
        ...(html ? { html } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        mock: false,
        channel: "email",
        error: sanitizeEmailProviderError(data.message ?? `Resend HTTP ${res.status}`),
      };
    }

    const id = typeof data.id === "string" ? data.id : undefined;
    return { success: true, mock: false, channel: "email", sid: id };
  } catch (err) {
    return {
      success: false,
      mock: false,
      channel: "email",
      error: err instanceof Error ? sanitizeEmailProviderError(err.message) : "Onbekende e-mailprovider fout",
    };
  }
}

export async function sendOfferMessage(input: OfferMessageInput): Promise<MessageResult> {
  const channel = input.channel ?? "email";
  if (channel === "email") {
    return sendEmail(input.to, input.subject, input.text, input.html);
  }

  const phone = normalizePhoneNumber(input.to);
  if (!phone.isValid || !phone.normalized) {
    return { success: false, mock: false, channel: "sms", error: phone.reason ?? "Geen geldig telefoonnummer" };
  }

  const result = await sendSms(phone.normalized, input.text);
  return {
    success: result.success,
    mock: result.mock,
    channel: "sms",
    sid: result.sid,
    error: result.error,
  };
}

export async function sendMessage(
  channel: MessageChannel,
  to: string,
  body: string,
): Promise<MessageResult> {
  if (channel === "email") {
    return sendEmail(to, "Bericht van NoShow Control", body);
  }
  return sendOfferMessage({ channel: "sms", to, subject: "", text: body });
}
