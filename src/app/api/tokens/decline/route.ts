import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { declineClaimToken } from "@/lib/tokens/service";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Patient-facing endpoint for "Nee, bedankt" on a claim offer.
 *
 * Mirrors /api/tokens/execute (the affirmative-claim endpoint) but with
 * decline semantics: token marked used, waitlist entry returned to WAITING,
 * slot stays available for other offered patients.
 *
 * Public endpoint — same rate-limit shape as the claim redirect to make
 * link-pasting brute-force attempts visible.
 */

const bodySchema = z.object({ token: z.string().min(20) });

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { allowed } = rateLimit(`decline:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het later opnieuw." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") ?? undefined;
  const result = await declineClaimToken(parsed.data.token, { ipAddress: ip, userAgent });

  // Always 200 — the outcome field carries the result kind. Keeps the
  // public link surface simple to consume from the browser.
  return NextResponse.json(result);
}
