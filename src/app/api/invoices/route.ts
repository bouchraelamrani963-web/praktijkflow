import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const month = req.nextUrl.searchParams.get("month"); // "2026-04"

  const where: Record<string, unknown> = { practiceId: user.practiceId };
  if (status && status !== "ALL") where.status = status;
  if (month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    where.issueDate = { gte: start, lt: end };
  }

  const [invoices, summary] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: { select: { firstName: true, lastName: true } } },
      orderBy: { issueDate: "desc" },
      take: 100,
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { practiceId: user.practiceId, ...(month ? { issueDate: where.issueDate as object } : {}) },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  // Build summary stats
  let totalRevenue = 0;
  let paidTotal = 0;
  let openTotal = 0;
  let invoiceCount = 0;

  for (const s of summary) {
    const sum = s._sum.total ?? 0;
    totalRevenue += sum;
    invoiceCount += s._count;
    if (s.status === "PAID") paidTotal += sum;
    if (s.status === "SENT" || s.status === "OVERDUE" || s.status === "DRAFT") openTotal += sum;
  }

  return NextResponse.json({
    invoices,
    stats: { totalRevenue, paidTotal, openTotal, invoiceCount },
  });
}
