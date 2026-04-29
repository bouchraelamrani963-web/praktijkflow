import { randomBytes, createHash } from "crypto";

/** Generate a cryptographically random URL-safe token. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** One-way SHA-256 hash of the raw token (hex-encoded). */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
