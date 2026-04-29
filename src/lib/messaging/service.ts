import { sendSms } from "@/lib/twilio";

export interface MessageResult {
  success: boolean;
  mock: boolean;
  channel: "sms" | "whatsapp" | "email";
  sid?: string;
  error?: string;
}

/**
 * Unified messaging interface.
 * Currently only SMS is fully implemented via Twilio.
 * WhatsApp and email are stubbed for future integration.
 */
export async function sendMessage(
  channel: "sms" | "whatsapp" | "email",
  to: string,
  body: string,
): Promise<MessageResult> {
  switch (channel) {
    case "sms": {
      const result = await sendSms(to, body);
      return {
        success: result.success,
        mock: result.mock,
        channel: "sms",
        sid: result.sid,
        error: result.error,
      };
    }
    case "whatsapp": {
      console.log(`[WHATSAPP STUB] To: ${to} | Body: ${body.slice(0, 120)}...`);
      return {
        success: true,
        mock: true,
        channel: "whatsapp",
        sid: `WA_MOCK_${Date.now()}`,
      };
    }
    case "email": {
      console.log(`[EMAIL STUB] To: ${to} | Body: ${body.slice(0, 120)}...`);
      return {
        success: true,
        mock: true,
        channel: "email",
        sid: `EMAIL_MOCK_${Date.now()}`,
      };
    }
  }
}
