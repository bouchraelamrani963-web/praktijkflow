/**
 * Resolves the public-facing base URL of the app.
 *
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL (explicit, set by the operator)
 *   2. VERCEL_PROJECT_PRODUCTION_URL (auto-set by Vercel on every deploy)
 *   3. localhost:3000 (development only — guarded by NODE_ENV)
 *
 * Always returns a URL without trailing slash.
 */
export function getPublicAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) {
    const url = explicit.replace(/\/+$/, "");
    if (process.env.NODE_ENV === "production" && url.includes("localhost")) {
      console.warn(
        `[getPublicAppUrl] NEXT_PUBLIC_APP_URL contains "localhost" in production — this is almost certainly wrong. Value: ${url}`,
      );
    }
    return url;
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) {
    const base = `https://${vercel}`.replace(/\/+$/, "");
    console.log(`[getPublicAppUrl] Using VERCEL_PROJECT_PRODUCTION_URL: ${base}`);
    return base;
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[getPublicAppUrl] No NEXT_PUBLIC_APP_URL or VERCEL_PROJECT_PRODUCTION_URL set in production — falling back to localhost",
    );
  }

  return "http://localhost:3000";
}

/**
 * Extracts the /action/<token> path from any URL or SMS body,
 * discarding the host so it can be rebuilt with getPublicAppUrl().
 */
export function extractActionPath(text: string): string | null {
  const match = text.match(/\/action\/[A-Za-z0-9._-]+/);
  return match ? match[0] : null;
}
