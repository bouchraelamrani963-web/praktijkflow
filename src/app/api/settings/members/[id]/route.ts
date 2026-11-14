import { NextRequest, NextResponse } from "next/server";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/validations/uuid";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId || !can(user.role, "manageMembers")) {
    return NextResponse.json({ error: "Onvoldoende bevoegdheden." }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Ongeldig lidmaatschap." }, { status: 400 });

  const result = await prisma.practiceMember.updateMany({
    where: { id, practiceId: user.practiceId, role: { not: "OWNER" } },
    data: { isActive: false },
  });
  if (!result.count) return NextResponse.json({ error: "Medewerker niet gevonden." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
