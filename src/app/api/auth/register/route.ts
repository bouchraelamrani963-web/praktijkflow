import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { adminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/db";
import { ensureDefaultAppointmentTypes } from "@/lib/dental/ensure-default-types";

/**
 * Server side of the registration flow.
 *
 * Called from the client after Firebase has minted an idToken for the new
 * user. This route:
 *
 *   1. Verifies the idToken via Firebase Admin (proves the caller actually
 *      owns the Firebase account).
 *   2. Upserts the User row in Prisma (idempotent — a re-call just refreshes
 *      firstName/lastName/email).
 *   3. If the user has no active practice membership yet, creates a fresh
 *      Practice + OWNER membership in a single transaction. This is the
 *      tenant-bootstrap step — without it, the new user lands on the dashboard
 *      with practiceId=null and every multi-tenant query 403's.
 *   4. Mints the HttpOnly session cookie.
 *
 * Idempotency: calling this route twice for the same Firebase user is safe.
 * The User upsert is by firebaseUid; Practice/Member creation is gated on
 * "no existing membership" so it doesn't proliferate practices.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { idToken, firstName, lastName, practiceName } = body as {
      idToken?: string;
      firstName?: string;
      lastName?: string;
      practiceName?: string;
    };

    if (!idToken || !firstName || !lastName || !practiceName) {
      return NextResponse.json(
        { error: "Missing required fields", required: ["idToken", "firstName", "lastName", "practiceName"] },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);

    // ─── Tenant bootstrap in one transaction ──────────────────────────────
    // Either everything is created or nothing — prevents the half-state
    // where a User exists but no Practice (which is what the *old* version
    // of this route produced and which made the dashboard unreachable).
    await prisma.$transaction(async (tx) => {
      // 1. User — upsert by firebaseUid
      const user = await tx.user.upsert({
        where: { firebaseUid: decoded.uid },
        update: {
          firstName,
          lastName,
          email: decoded.email ?? "",
        },
        create: {
          firebaseUid: decoded.uid,
          email: decoded.email ?? "",
          firstName,
          lastName,
        },
      });

      // 2. If they already have an active membership, skip practice creation —
      //    this happens on re-call (e.g. user closed the page and re-submitted).
      const existing = await tx.practiceMember.findFirst({
        where: { userId: user.id, isActive: true },
        select: { id: true },
      });
      if (existing) return;

      // 3. New tenant. Slug is name-derived + 6-char hex suffix to guarantee
      //    uniqueness even if two users pick the same practice name.
      const practice = await tx.practice.create({
        data: {
          name: practiceName,
          slug: makeSlug(practiceName),
          email: decoded.email ?? null,
        },
      });

      await tx.practiceMember.create({
        data: {
          practiceId: practice.id,
          userId: user.id,
          role: "OWNER",
          isActive: true,
        },
      });

      // 4. Bootstrap the KNMT 2025 dental treatment-code catalog so the
      //    appointment "Type behandeling" dropdown is populated from day
      //    one with the official Dutch tariffs. Practices can edit/extend
      //    later under Instellingen → Behandeltypes; the same list is
      //    restorable via POST /api/admin/restore-treatment-types.
      await ensureDefaultAppointmentTypes(tx, practice.id);
    });

    // ─── Mint HttpOnly session cookie ─────────────────────────────────────
    const SESSION_EXPIRES_IN = 60 * 60 * 24 * 7 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN,
    });

    const response = NextResponse.json({ status: "ok" });
    response.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN / 1000,
    });

    return response;
  } catch (error) {
    // Log the real error server-side so Vercel logs show what broke.
    console.error("[api.auth.register] failed:", error);
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: "Registration failed", message }, { status: 500 });
  }
}

/**
 * Diacritic-stripped, hyphenated, lowercase slug. Adds a short hex suffix
 * so two practices named "Tandartspraktijk Centrum" don't collide on the
 * unique slug constraint. Falls back to "praktijk" if the input strips to
 * empty (e.g. a name made entirely of punctuation).
 */
function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = randomBytes(3).toString("hex");
  return `${base || "praktijk"}-${suffix}`;
}
