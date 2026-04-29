import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * True when a Postgres connection string is configured. Does not check
 * reachability — only that the env var is non-empty. Used at the module
 * boundary to decide whether to attempt a query at all.
 */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

// Surface a one-time warning at module load when DATABASE_URL is missing.
// Adapter construction does not throw with an empty connection string, but the
// first query will — so we want operators to see this *before* a request hits
// production. The check runs once per cold start.
if (!isDatabaseConfigured()) {
  console.warn(
    "[db] DATABASE_URL is not set — Prisma queries will fail. " +
      "Server pages using safeQuery() fall back to empty data; " +
      "raw `prisma.*` calls will throw at the call site.",
  );
}

function createPrismaClient() {
  // Use empty string (not undefined) so adapter construction is consistent.
  // The query layer is what fails when the URL is missing/invalid.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
};

// Singleton: reuse across hot-reloads in dev and across requests on a warm
// serverless instance in production.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Wrap a Prisma query so a missing DATABASE_URL or a connection failure
 * resolves to a fallback value instead of crashing the calling Server
 * Component or Route Handler.
 *
 * Use in read paths (list pages, GET routes) where graceful degradation is
 * preferable to Vercel's "This page couldn't load" 500 screen. Do NOT use for
 * writes — silent fallback on a write would corrupt the user model.
 *
 * @example
 *   const items = await safeQuery(
 *     "appointments.list",
 *     () => prisma.appointment.findMany({ where: { practiceId } }),
 *     [],
 *   );
 */
export async function safeQuery<T>(
  label: string,
  query: () => Promise<T>,
  fallback: T,
): Promise<T> {
  // Missing DATABASE_URL: warn in EVERY environment (including production) so
  // operators can spot the cause when a deployed page reads as empty. The
  // previous dev-only gate hid this from Vercel logs, which made the
  // "everything is empty but the build succeeded" symptom hard to diagnose.
  if (!isDatabaseConfigured()) {
    console.warn(`[safeQuery:${label}] DATABASE_URL not set — returning fallback`);
    return fallback;
  }
  try {
    return await query();
  } catch (err) {
    // Always log query failures — these are runtime DB-reach problems and
    // operators need to see them in production logs.
    console.error(
      `[safeQuery:${label}] query failed — returning fallback:`,
      err instanceof Error ? err.message : err,
    );
    return fallback;
  }
}
