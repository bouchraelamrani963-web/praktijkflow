import { NextRequest, NextResponse } from "next/server";

// All routes that require authentication
const protectedPrefixes = [
  "/dashboard",
  "/appointments",
  "/patients",
  "/facturatie",
  "/instellingen",
  "/open-slots",
  "/waitlist",
  "/help",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get("session")?.value;
  const isAuthenticated = !!session;

  // Redirect unauthenticated users to login
  if (protectedPrefixes.some((p) => pathname.startsWith(p)) && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/appointments/:path*",
    "/patients/:path*",
    "/facturatie/:path*",
    "/instellingen/:path*",
    "/open-slots/:path*",
    "/waitlist/:path*",
    "/help/:path*",
    "/login",
    "/register",
  ],
};
