/**
 * Lightweight Twilio SMS wrapper.
 * Uses the REST API directly (no SDK dependency).
 * Sends real SMS only when SMS_TEST_MODE=false and Twilio is configured.
 * Every other SMS_TEST_MODE value is fail-safe test mode.
 */
import { getPublicAppUrl, extractActionPath } from "@/lib/url";
import { maskPhoneNumber, maskPhoneNumbersInText, normalizePhoneNumber } from "@/lib/phone";

export interface SmsResult {
  success: boolean;
  mock: boolean;
  sid?: string;
  error?: string;
}

const TWILIO_API = "https://api.twilio.com/2010-04-01";

function getConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();
  return { accountSid, authToken, from };
}

export function isTwilioConfigured(): boolean {
  const { accountSid, authToken, from } = getConfig();
  return Boolean(accountSid && authToken && from);
}

/**
 * Test mode — when SMS_TEST_MODE=true, sendSms() never hits Twilio.
 * It returns a synthetic mock result so the calling flow (offer endpoint,
 * MessageLog, UI) can run end-to-end without spending SMS credits or
 * spamming patients during testing. Test mode bypasses the Twilio
 * configuration gate entirely — works whether or not Twilio creds are set.
 *
 * Useful workflow:
 *   1. Operator sets SMS_TEST_MODE=true on Vercel
 *   2. Clicks "Stuur aanbod" — UI shows the generated claim URLs
 *   3. Operator clicks each link to walk the claim flow as if a patient
 *   4. Once happy, sets SMS_TEST_MODE=false → real SMS to next batch
 */
export function isSmsTestMode(): boolean {
  return process.env.SMS_TEST_MODE?.trim().toLowerCase() !== "false";
}

export function isRealSmsEnabled(): boolean {
  return !isSmsTestMode() && isTwilioConfigured();
}

/**
 * "Are we allowed to attempt a send?" — the OR of test-mode and a real
 * configured Twilio. The offer endpoint and any other gated flow uses
 * this single helper instead of computing it themselves so behaviour
 * stays consistent.
 */
export function isSmsAllowed(): boolean {
  return isSmsTestMode() || isRealSmsEnabled();
}

/**
 * Extracts an action-token URL from an SMS body and rebuilds it with the
 * current public base URL. This ensures that even if the persisted SMS body
 * contains localhost, the returned URL points to the correct production host.
 */
export function extractActionUrl(body: string): string | null {
  const path = extractActionPath(body);
  if (!path) return null;
  return `${getPublicAppUrl()}${path}`;
}

function safeSmsLog(label: string, to: string, body: string) {
  if (process.env.NODE_ENV === "production") {
    const actionPath = extractActionPath(body);
    console.log(`${label} To: ${maskPhoneNumber(to)}${actionPath ? " | Action link generated" : ""}`);
    return;
  }

  console.log(`${label} To: ${to} | Body: ${body}`);
}

function sanitizeProviderError(message: unknown): string {
  const raw = typeof message === "string" && message.trim()
    ? message
    : "SMS provider error";
  return maskPhoneNumbersInText(raw);
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const { accountSid, authToken, from } = getConfig();
  const phone = normalizePhoneNumber(to);
  if (!phone.isValid || !phone.normalized) {
    return { success: false, mock: false, error: phone.reason ?? "Geen geldig telefoonnummer" };
  }

  // Explicit SMS_TEST_MODE: walk the flow without hitting Twilio. Production
  // logs are masked; local logs keep the body visible for development checks.
  if (isSmsTestMode()) {
    safeSmsLog("[SMS TEST MODE]", phone.normalized, body);
    const actionUrl = extractActionUrl(body);
    if (actionUrl && process.env.NODE_ENV !== "production") {
      console.log(`[SMS TEST MODE LINK] ${actionUrl}`);
    }
    return { success: true, mock: true, sid: `TEST_${Date.now()}` };
  }

  // Real SMS is allowed only through the central config gate.
  if (!isRealSmsEnabled() || !accountSid || !authToken || !from) {
    return { success: false, mock: false, error: "SMS provider niet geconfigureerd" };
  }

  try {
    const res = await fetch(
      `${TWILIO_API}/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone.normalized, From: from, Body: body }),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        mock: false,
        error: sanitizeProviderError(data.message ?? `Twilio HTTP ${res.status}`),
      };
    }

    return { success: true, mock: false, sid: data.sid };
  } catch (err) {
    return {
      success: false,
      mock: false,
      error: err instanceof Error ? sanitizeProviderError(err.message) : "Unknown Twilio error",
    };
  }
}
