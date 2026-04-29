import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/db";

/**
 * After client-side Firebase signup, this route creates the Prisma User record
 * and (optionally) provisions the session. Called from the register page.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken, firstName, lastName } = await req.json();

    if (!idToken || !firstName || !lastName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);

    // Upsert: in case the user was partially created
    await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: { firstName, lastName, email: decoded.email ?? "" },
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? "",
        firstName,
        lastName,
      },
    });

    // Mint session cookie
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
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
