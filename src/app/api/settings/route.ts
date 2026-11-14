import { can } from "@/lib/auth/permissions";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";
import { prisma } from "@/lib/db";

const optionalText = z.string().trim().max(255).nullable().optional();
const settingsSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: optionalText,
  address: optionalText,
  city: optionalText,
  zipCode: optionalText,
  kvkNumber: optionalText,
  agbCode: optionalText,
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const practice = await prisma.practice.findUnique({
    where: { id: user.practiceId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      zipCode: true,
      kvkNumber: true,
      agbCode: true,
    },
  });

  if (!practice) return NextResponse.json({ error: "Practice not found" }, { status: 404 });

  return NextResponse.json({ practice });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });
  if (!can(user.role, "practiceSettings")) return NextResponse.json({ error: "Onvoldoende bevoegdheden." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige praktijkgegevens.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Geen wijzigingen" }, { status: 400 });
  }

  const practice = await prisma.practice.update({
    where: { id: user.practiceId },
    data,
  });

  return NextResponse.json({ practice });
}
