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

    let user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      include: {
        memberships: {
          where: { isActive: true },
          include: { practice: { select: { id: true, name: true } } },
          take: 1, // MVP: use first active membership
        },
      },
    });

    if (!user || user.memberships.length === 0) {
      user = await ensureUserHasPractice(decoded);
    }

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
 * Repairs legacy or manually-created Firebase accounts that can authenticate
 * but do not yet have the required local User + PracticeMember rows.
 *
 * This keeps login idempotent: once a user has any active membership, it is
 * reused. Otherwise we create a deterministic personal practice and OWNER
 * membership so protected dashboard APIs have a valid practice scope.
 */
async function ensureUserHasPractice(decoded: DecodedIdToken) {
  const email = decoded.email ?? `${decoded.uid}@firebase.local`;
  const { firstName, lastName } = nameParts(decoded.name, email);
  const practiceName = `${firstName}'s praktijk`;
  const practiceSlug = `praktijk-${slugPart(decoded.uid)}`;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: { email, firstName, lastName },
      create: {
        firebaseUid: decoded.uid,
        email,
        firstName,
        lastName,
      },
    });

    const existing = await tx.practiceMember.findFirst({
      where: { userId: user.id, isActive: true },
      include: { practice: { select: { id: true, name: true } } },
      take: 1,
    });

    if (existing) {
      return { ...user, memberships: [existing] };
    }

    const practice = await tx.practice.upsert({
      where: { slug: practiceSlug },
      update: { email },
      create: {
        name: practiceName,
        slug: practiceSlug,
        email,
      },
      select: { id: true, name: true },
    });

    const membership = await tx.practiceMember.upsert({
      where: {
        practiceId_userId: {
          practiceId: practice.id,
          userId: user.id,
        },
      },
      update: { isActive: true, role: "OWNER" },
      create: {
        practiceId: practice.id,
        userId: user.id,
        role: "OWNER",
        isActive: true,
      },
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

/**
 * Check if the user has one of the required roles.
 */
export function hasRole(user: SessionUser, roles: Role[]): boolean {
  return user.role !== null && roles.includes(user.role);
}
