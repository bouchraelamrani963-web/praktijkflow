import { NextRequest, NextResponse } from "next/server";
import { resolvePracticeUser } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";

const SESSION_EXPIRES_IN = 60 * 60 * 24 * 7 * 1000; // 7 days

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the Firebase ID token server-side before minting a cookie.
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    if (!(await resolvePracticeUser(decoded))) {
      const denied = NextResponse.json({ error: "Geen actief praktijklidmaatschap." }, { status: 403 });
      denied.cookies.delete("session");
      return denied;
    }

    // Create a long-lived session cookie after verification succeeds.
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
    console.error("Session creation error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
