/**
 * Simple in-memory rate limiter.
 * Tracks request counts per key (IP) within a sliding window.
 * Not shared across instances — sufficient for MVP / single-server.
 */

const store = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 60s to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

export function rateLimit(
  key: string,
  { limit = 10, windowMs = 60_000 } = {},
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  return { allowed: entry.count <= limit, remaining };
}
