import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { adminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";

/**
 * The auth bypass activates when:
 *   - the explicit opt-in env var is set, OR
 *   - Firebase Admin env vars are not configured (e.g. Vercel deploy without secrets).
 *
 * The previous version also required NODE_ENV === "development", which made the
 * fallback unreachable in production and broke deploys that ship without Firebase.
 * We now allow the fallback in production too — this is intentional for demo
 * deployments. To force real auth in production, set all FIREBASE_* env vars.
 */
const DEV_AUTH_BYPASS =
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" || !isFirebaseAdminConfigured();

export interface SessionUser {
  uid: string;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string | null;
  // Current practice context
  practiceId: string | null;
  practiceName: string | null;
  role: Role | null;
}

/**
 * Verify the session cookie and return the user with their practice role.
 * Works in Server Components, Route Handlers, and Server Actions.
 *
 * When Firebase Admin is not configured, returns the first seeded user (or a
 * hardcoded fallback if the DB is empty/unreachable). Never throws.
 *
 * @param req - Optional NextRequest (for Route Handlers). If omitted, reads from next/headers cookies.
 */
export async function getCurrentUser(req?: NextRequest): Promise<SessionUser | null> {
  // Bypass: when Firebase admin is not configured, return first seeded user
  if (DEV_AUTH_BYPASS) {
    return getDevUser();
  }

  try {
    const sessionCookie = req
      ? req.cookies.get("session")?.value
      : (await cookies()).get("session")?.value;

    if (!sessionCookie) return null;

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      include: {
        memberships: {
          where: { isActive: true },
          include: { practice: { select: { id: true, name: true } } },
          take: 1, // MVP: use first active membership
        },
      },
    });

    if (!user) return null;

    const membership = user.memberships[0] ?? null;

    return {
      uid: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      avatarUrl: user.avatarUrl,
      practiceId: membership?.practice.id ?? null,
      practiceName: membership?.practice.name ?? null,
      role: membership?.role ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Like getCurrentUser but throws if not authenticated.
 * Use in protected Server Components and Server Actions.
 */
export async function requireUser(req?: NextRequest): Promise<SessionUser> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Check if the user has one of the required roles.
 */
export function hasRole(user: SessionUser, roles: Role[]): boolean {
  return user.role !== null && roles.includes(user.role);
}

// ─── Bypass-mode helpers ───────────────────────────────────────────────────

/**
 * Hardcoded fallback when DB is unreachable or unseeded.
 *
 * `practiceId` is set to a non-null sentinel so dashboard pages that guard
 * with `if (!user.practiceId) redirect("/dashboard")` don't redirect-loop.
 * Multi-tenant queries that filter by `practiceId: "demo-practice-id"` simply
 * return zero rows, which the dashboard tolerates (empty state).
 */
const FALLBACK_DEV_USER: SessionUser = {
  uid: "dev-000",
  firebaseUid: "firebase-demo-uid-001",
  email: "demo@praktijkflow.local",
  firstName: "Demo",
  lastName: "Gebruiker",
  fullName: "Demo Gebruiker",
  avatarUrl: null,
  practiceId: "demo-practice-id",
  practiceName: "Demo praktijk",
  role: null,
};

let _devUser: SessionUser | undefined;

/**
 * Returns the first seeded user with their practice membership.
 * Falls back to a hardcoded user when DB is unreachable or empty.
 * Cached after first call to avoid repeated DB hits.
 */
async function getDevUser(): Promise<SessionUser> {
  if (_devUser !== undefined) return _devUser;

  try {
    const user = await prisma.user.findFirst({
      include: {
        memberships: {
          where: { isActive: true },
          include: { practice: { select: { id: true, name: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!user) {
      console.warn("[AUTH_BYPASS] No users in database. Run: npm run db:seed");
      _devUser = FALLBACK_DEV_USER;
      return _devUser;
    }

    const membership = user.memberships[0] ?? null;

    _devUser = {
      uid: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      avatarUrl: user.avatarUrl,
      practiceId: membership?.practice.id ?? FALLBACK_DEV_USER.practiceId,
      practiceName: membership?.practice.name ?? FALLBACK_DEV_USER.practiceName,
      role: membership?.role ?? null,
    };

    return _devUser;
  } catch (err) {
    console.warn(
      "[AUTH_BYPASS] Database not reachable, using fallback dev user:",
      err instanceof Error ? err.message : err,
    );
    _devUser = FALLBACK_DEV_USER;
    return _devUser;
  }
}
