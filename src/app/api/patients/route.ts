import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma, safeQuery } from "@/lib/db";
import { patientCreateSchema, patientQuerySchema } from "@/lib/validations/patient";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const parsed = patientQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { q, riskLevel, isActive, waitlistOptIn, page, pageSize } = parsed.data;

  const where: Prisma.ClientWhereInput = {
    practiceId: user.practiceId,
    ...(riskLevel && { riskLevel }),
    ...(typeof isActive === "boolean" && { isActive }),
    ...(typeof waitlistOptIn === "boolean" && { waitlistOptIn }),
    ...(q && {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    }),
  };

  // Wrap the read so a missing/unreachable DB returns an empty list instead
  // of a 500 — the /patients client page renders the empty state ("Geen
  // patiënten gevonden") rather than the red error banner.
  const result = await safeQuery(
    "api.patients.list",
    async () => {
      const [total, items] = await Promise.all([
        prisma.client.count({ where }),
        prisma.client.findMany({
          where,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return { total, items };
    },
    { total: 0, items: [] as Prisma.ClientGetPayload<{}>[] },
  );

  return NextResponse.json({
    items: result.items ?? [],
    total: result.total ?? 0,
    page,
    pageSize,
  });
}

export async function POST(req: NextRequest) {
  // Writes do NOT use safeQuery — silent fallback on a create would mislead
  // the user. Real failure must surface as a 500 the toast layer can display.
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patientCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const patient = await prisma.client.create({
    data: { ...parsed.data, practiceId: user.practiceId },
  });

  return NextResponse.json({ patient }, { status: 201 });
}
