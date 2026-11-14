import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { adminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";
import type { DecodedIdToken } from "firebase-admin/auth";
import { ensureDefaultAppointmentTypes } from "@/lib/dental/ensure-default-types";

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
 * Missing Firebase Admin configuration, missing cookies, invalid cookies, or
 * revoked sessions all fail closed and return null.
 *
 * @param req - Optional NextRequest (for Route Handlers). If omitted, reads from next/headers cookies.
 */
export async function getCurrentUser(req?: NextRequest): Promise<SessionUser | null> {
  const sessionCookie = req
    ? req.cookies.get("session")?.value
    : (await cookies()).get("session")?.value;

  try {
    if (!sessionCookie) return null;
    if (!isFirebaseAdminConfigured()) return null;

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    const user = await resolvePracticeUser(decoded);
    const membership = user?.memberships[0];
    if (!user || !membership) return null;

    return {
      uid: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      avatarUrl: user.avatarUrl,
      practiceId: membership.practice.id,
      practiceName: membership.practice.name,
      role: membership.role,
    };
  } catch {
    return null;
  }
}

const activeMembership = {
  where: { isActive: true },
  include: { practice: { select: { id: true, name: true } } },
  orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
  take: 1,
};

function findPracticeUser(db: Pick<typeof prisma, "user">, firebaseUid: string) {
  return db.user.findUnique({
    where: { firebaseUid },
    include: { memberships: activeMembership, _count: { select: { memberships: true } } },
  });
}

export async function resolvePracticeUser(decoded: DecodedIdToken) {
  const user = await findPracticeUser(prisma, decoded.uid);

  if (user?.memberships.length) return user;
  // Keep the inactive row as a permanent record of access removal.
  if (user?._count.memberships) return null;
  return bootstrapLegacyPractice(decoded);
}

/** Repair existing accounts without membership history, including IAM-created users. */
async function bootstrapLegacyPractice(decoded: DecodedIdToken) {
  const email = decoded.email ?? `${decoded.uid}@firebase.local`;
  const { firstName, lastName } = nameParts(decoded.name, email);

  return prisma.$transaction(async (tx) => {
    // The upsert serializes concurrent bootstraps for this Firebase user.
    await tx.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: { email, firstName, lastName },
      create: { firebaseUid: decoded.uid, email, firstName, lastName },
    });
    const user = await findPracticeUser(tx, decoded.uid);
    if (!user) return null;
    if (user.memberships.length) return user;
    if (user._count.memberships) return null;

    const practice = await tx.practice.create({
      data: {
        name: `${firstName}'s praktijk`,
        slug: `praktijk-${slugPart(decoded.uid)}-${user.id}`,
        email,
      },
      select: { id: true, name: true },
    });
    const membership = await tx.practiceMember.create({
      data: { practiceId: practice.id, userId: user.id, role: "OWNER" },
      include: { practice: { select: { id: true, name: true } } },
    });
    await ensureDefaultAppointmentTypes(tx, practice.id);
    return { ...user, memberships: [membership] };
  });
}

function nameParts(name: string | undefined, email: string) {
  const fallback = email.split("@")[0]?.replace(/[._-]+/g, " ") || "Gebruiker";
  const parts = (name?.trim() || fallback).split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Gebruiker";
  const lastName = parts.slice(1).join(" ") || firstName;
  return { firstName, lastName };
}

function slugPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "account";
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
