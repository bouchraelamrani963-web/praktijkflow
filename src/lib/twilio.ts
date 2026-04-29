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

  if (!accountSid || !authToken || !from) {
    // Full body (no truncation) + dedicated URL line for frictionless copy-paste.
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
