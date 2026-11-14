import { NextRequest, NextResponse } from "next/server";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId || !can(user.role, "manageMembers")) {
    return NextResponse.json({ error: "Onvoldoende bevoegdheden." }, { status: 403 });
  }

  const members = await prisma.practiceMember.findMany({
    where: { practiceId: user.practiceId },
    select: {
      id: true, role: true, isActive: true,
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return NextResponse.json({ members }, { headers: { "Cache-Control": "private, no-store" } });
}
