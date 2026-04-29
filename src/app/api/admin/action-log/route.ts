import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/**
 * Last N ActionLog rows for slot/claim related actions.
 * Admin only.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });
  if (!hasRole(user, ["OWNER", "ADMIN"])) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? 10);
  const limit = Math.max(1, Math.min(50, Number.isFinite(limitParam) ? limitParam : 10));

  const rows = await prisma.actionLog.findMany({
    where: {
      practiceId: user.practiceId,
      action: {
        in: [
          "slot_freed",
          "auto_offer_sent",
          "auto_offer_skipped",
          "claim_open_slot",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // ActionLog has no direct client relation — fetch clients in one batch
  const clientIds = [
    ...new Set(rows.map((r) => r.clientId).filter((id): id is string => Boolean(id))),
  ];
  const clients = clientIds.length
    ? await prisma.client.findMany({
        where: { id: { in: clientIds }, practiceId: user.practiceId },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const nameById = new Map(
    clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`]),
  );

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      action: r.action,
      outcome: r.outcome,
      createdAt: r.createdAt,
      clientName: r.clientId ? nameById.get(r.clientId) ?? null : null,
      details: r.details,
    })),
  });
}
