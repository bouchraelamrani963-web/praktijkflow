import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed = ["name", "email", "phone", "address", "city", "zipCode", "kvkNumber", "agbCode"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Geen wijzigingen" }, { status: 400 });
  }

  const practice = await prisma.practice.update({
    where: { id: user.practiceId },
    data,
  });

  return NextResponse.json({ practice });
}
