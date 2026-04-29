import { NextRequest, NextResponse } from "next/server";

// Dev bypass: skip all auth redirects when explicitly enabled in development.
// In production NODE_ENV is "production", so this is always false.
const DEV_AUTH_BYPASS =
  process.env.NODE_ENV === "development" &&
  (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" ||
    !(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID));

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

// Routes only for unauthenticated users
const authOnlyPaths = ["/login", "/register"];

export function middleware(req: NextRequest) {
  // In dev bypass mode, let every request through without cookie checks
  if (DEV_AUTH_BYPASS) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  const session = req.cookies.get("session")?.value;
  const isAuthenticated = !!session;

  // Redirect authenticated users away from login/register
  if (authOnlyPaths.some((p) => pathname.startsWith(p)) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

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
