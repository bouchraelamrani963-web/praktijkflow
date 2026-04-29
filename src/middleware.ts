import { NextRequest, NextResponse } from "next/server";

/**
 * Auth bypass: skip all auth redirects when Firebase isn't configured or when
 * explicitly opted-in via NEXT_PUBLIC_DEV_AUTH_BYPASS=true.
 *
 * Previously this was gated to NODE_ENV === "development" only, which made
 * production deploys without Firebase credentials fail with a redirect loop
 * (no cookie → /login → cookie still missing → /login). The gate is now
 * environment-agnostic so demo deployments without Firebase still work.
 *
 * NEXT_PUBLIC_ vars are inlined at build time, so this is evaluated once.
 */
const DEV_AUTH_BYPASS =
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" ||
  !(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

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
  // In bypass mode, let every request through without cookie checks
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
