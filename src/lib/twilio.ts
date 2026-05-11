/**
 * Lightweight Twilio SMS wrapper.
 * Uses the REST API directly (no SDK dependency).
 * Falls back to console logging when credentials are missing.
 */

export interface SmsResult {
  success: boolean;
  mock: boolean;
  sid?: string;
  error?: string;
}

const TWILIO_API = "https://api.twilio.com/2010-04-01";

function getConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
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
  return process.env.SMS_TEST_MODE === "true";
}

/**
 * "Are we allowed to attempt a send?" — the OR of test-mode and a real
 * configured Twilio. The offer endpoint and any other gated flow uses
 * this single helper instead of computing it themselves so behaviour
 * stays consistent.
 */
export function isSmsAllowed(): boolean {
  return isSmsTestMode() || isTwilioConfigured();
}

/**
 * Extracts any action-token URL from an SMS body so we can log it on a
 * dedicated, easy-to-copy line. Matches both absolute (`https://host/action/<tok>`)
 * and path-only (`/action/<tok>`) forms.
 */
function extractActionUrl(body: string): string | null {
  // Absolute URL first — wins when both forms appear.
  const absolute = body.match(/https?:\/\/[^\s]+\/action\/[A-Za-z0-9._-]+/);
  if (absolute) return absolute[0];

  const relative = body.match(/\/action\/[A-Za-z0-9._-]+/);
  if (!relative) return null;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/+$/, "")}${relative[0]}`;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const { accountSid, authToken, from } = getConfig();

  // Explicit SMS_TEST_MODE — caller has opted into walking the flow without
  // hitting Twilio. We log the body (helpful in Vercel function logs for
  // server-side verification) but the operator-facing claim URL is also
  // surfaced separately by the offer endpoint so they don't need log access.
  if (isSmsTestMode()) {
    console.log(`[SMS TEST MODE] To: ${to} | Body: ${body}`);
    const actionUrl = extractActionUrl(body);
    if (actionUrl) {
      console.log(`[SMS TEST MODE LINK] ${actionUrl}`);
    }
    return { success: true, mock: true, sid: `TEST_${Date.now()}` };
  }

  // Twilio missing AND not in test mode — historically the function returned
  // a fake-success "MOCK_*" sid which downstream callers (the OLD offer
  // endpoint, the reminder service) treated as a real send. The current
  // open-slot offer endpoint gates on isSmsAllowed() upstream, so this
  // branch should be unreachable from that path. We keep the mock fallback
  // for legacy callers (reminder service in non-test-mode) but mark it
  // clearly so it doesn't get mistaken for a real send.
  if (!accountSid || !authToken || !from) {
    console.log(`[TWILIO MOCK] To: ${to} | Body: ${body}`);
    const actionUrl = extractActionUrl(body);
    if (actionUrl) {
      console.log(`[TWILIO MOCK LINK] ${actionUrl}`);
    }
    return { success: true, mock: true, sid: `MOCK_${Date.now()}` };
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
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        mock: false,
        error: data.message ?? `Twilio HTTP ${res.status}`,
      };
    }

    return { success: true, mock: false, sid: data.sid };
  } catch (err) {
    return {
      success: false,
      mock: false,
      error: err instanceof Error ? err.message : "Unknown Twilio error",
    };
  }
}
