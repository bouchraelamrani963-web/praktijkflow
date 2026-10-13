/**
 * Resolves the public-facing base URL of the app.
 *
 * Priority:
 *   1. Production: NEXT_PUBLIC_APP_URL (explicit, set by the operator)
 *   2. Preview: VERCEL_BRANCH_URL, then VERCEL_URL (never production URL)
 *   3. Development: NEXT_PUBLIC_APP_URL, then localhost:3000
 *
 * Always returns a URL without trailing slash.
 */
export function getPublicAppUrl(): string {
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  const isPreview = vercelEnv === "preview";
  const isProduction = vercelEnv === "production" || process.env.NODE_ENV === "production";

  if (isPreview) {
    const previewUrl = normalizeUrl(process.env.VERCEL_BRANCH_URL) ?? normalizeUrl(process.env.VERCEL_URL);
    if (!previewUrl) {
      throw new Error(
        "Preview public URL is not configured. Set VERCEL_BRANCH_URL or VERCEL_URL before generating action links.",
      );
    }
    if (isProductionHost(previewUrl)) {
      throw new Error("Preview public URL resolved to the production domain. Refusing to generate action links.");
    }
    return previewUrl;
  }

  const explicit = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (explicit) {
    if (isProduction && explicit.includes("localhost")) {
      throw new Error("NEXT_PUBLIC_APP_URL points to localhost in production. Refusing to generate action links.");
    }
    return explicit;
  }

  if (isProduction) {
    throw new Error("Production public URL is not configured. Set NEXT_PUBLIC_APP_URL before generating action links.");
  }

  return "http://localhost:3000";
}

function normalizeUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function isProductionHost(url: string): boolean {
  try {
    return new URL(url).hostname === "noshowcontrol.nl";
  } catch {
    return false;
  }
}

/**
 * Extracts the /action/<token> path from any URL or SMS body,
 * discarding the host so it can be rebuilt with getPublicAppUrl().
 */
export function extractActionPath(text: string): string | null {
  const match = text.match(/\/action\/[A-Za-z0-9._-]+/);
  return match ? match[0] : null;
}
