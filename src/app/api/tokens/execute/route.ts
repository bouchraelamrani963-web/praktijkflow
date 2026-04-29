import { NextRequest, NextResponse } from "next/server";
import { executeTokenSchema } from "@/lib/validations/token";
import { executeToken } from "@/lib/tokens/service";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Public endpoint — no auth required.
 * Patients POST here to execute their action token.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  const { allowed } = rateLimit(`token-exec:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Te veel verzoeken. Probeer het later opnieuw." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = executeTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ua = req.headers.get("user-agent") ?? undefined;

  const result = await executeToken(parsed.data.token, {
    ipAddress: ip,
    userAgent: ua,
  });

  const httpStatus = result.outcome === "success" ? 200
    : result.outcome === "invalid" ? 404
    : result.outcome === "expired" || result.outcome === "already_used" ? 410
    : 500;

  return NextResponse.json(result, { status: httpStatus });
}
