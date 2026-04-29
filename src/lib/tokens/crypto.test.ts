import { describe, it, expect } from "vitest";
import { generateToken, hashToken } from "./crypto";

describe("generateToken", () => {
  it("returns a non-empty string", () => {
    const token = generateToken();
    expect(token.length).toBeGreaterThan(0);
  });

  it("generates URL-safe base64 (no +, /, =)", () => {
    for (let i = 0; i < 20; i++) {
      const token = generateToken();
      expect(token).not.toMatch(/[+/=]/);
    }
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateToken()));
    expect(tokens.size).toBe(50);
  });

  it("respects custom byte length", () => {
    const short = generateToken(16);
    const long = generateToken(64);
    // base64url: 4 chars per 3 bytes → 16 bytes ≈ 22 chars, 64 bytes ≈ 86 chars
    expect(short.length).toBeLessThan(long.length);
  });
});

describe("hashToken", () => {
  it("returns a 64-char hex string (SHA-256)", () => {
    const hash = hashToken("test-token");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    const a = hashToken("same-input");
    const b = hashToken("same-input");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", () => {
    const a = hashToken("token-a");
    const b = hashToken("token-b");
    expect(a).not.toBe(b);
  });

  it("hash differs from raw token", () => {
    const raw = "my-raw-token";
    const hash = hashToken(raw);
    expect(hash).not.toBe(raw);
  });

  it("hashes generated tokens consistently", () => {
    const raw = generateToken();
    const h1 = hashToken(raw);
    const h2 = hashToken(raw);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});
