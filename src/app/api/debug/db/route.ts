import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const maskedPassword = parsed.password ? "****" : "(none)";
    return `postgresql://${parsed.username}:${maskedPassword}@${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return "(malformed URL)";
  }
}

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const url = process.env.DATABASE_URL || "";

  const info = {
    maskedUrl: url ? maskUrl(url) : "(not set)",
    hasPassword: url ? url.includes(":") && new URL(url).password !== "" : false,
    isPooler: url.includes("-pooler"),
    isLocalhost: url.includes("localhost") || url.includes("127.0.0.1"),
  };

  try {
    const result: unknown[] = await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    return NextResponse.json({
      status: "connected",
      query: result,
      database: info,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        status: "error",
        error: message,
        database: info,
      },
      { status: 500 }
    );
  }
}
