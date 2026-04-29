import { describe, it, expect } from "vitest";

// Test the time preference matching logic directly
// (extracted for testability since the DB-dependent function can't be unit-tested here)

function matchesTimePreference(pref: string, hour: number): boolean {
  const lower = pref.toLowerCase().trim();

  if (lower === "morning" || lower === "ochtend") return hour >= 8 && hour < 12;
  if (lower === "afternoon" || lower === "middag") return hour >= 12 && hour < 17;
  if (lower === "evening" || lower === "avond") return hour >= 17 && hour < 21;

  const rangeMatch = lower.match(/^(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[3], 10);
    return hour >= start && hour < end;
  }

  return false;
}

describe("matchesTimePreference", () => {
  it("matches morning/ochtend for 8–11", () => {
    expect(matchesTimePreference("morning", 8)).toBe(true);
    expect(matchesTimePreference("morning", 11)).toBe(true);
    expect(matchesTimePreference("ochtend", 9)).toBe(true);
    expect(matchesTimePreference("morning", 12)).toBe(false);
    expect(matchesTimePreference("morning", 7)).toBe(false);
  });

  it("matches afternoon/middag for 12–16", () => {
    expect(matchesTimePreference("afternoon", 12)).toBe(true);
    expect(matchesTimePreference("middag", 14)).toBe(true);
    expect(matchesTimePreference("afternoon", 16)).toBe(true);
    expect(matchesTimePreference("afternoon", 17)).toBe(false);
    expect(matchesTimePreference("afternoon", 11)).toBe(false);
  });

  it("matches evening/avond for 17–20", () => {
    expect(matchesTimePreference("evening", 17)).toBe(true);
    expect(matchesTimePreference("avond", 19)).toBe(true);
    expect(matchesTimePreference("evening", 20)).toBe(true);
    expect(matchesTimePreference("evening", 21)).toBe(false);
    expect(matchesTimePreference("evening", 16)).toBe(false);
  });

  it("matches HH:MM-HH:MM range", () => {
    expect(matchesTimePreference("09:00-12:00", 9)).toBe(true);
    expect(matchesTimePreference("09:00-12:00", 11)).toBe(true);
    expect(matchesTimePreference("09:00-12:00", 12)).toBe(false);
    expect(matchesTimePreference("09:00-12:00", 8)).toBe(false);
  });

  it("matches HH-HH shorthand", () => {
    expect(matchesTimePreference("9-17", 9)).toBe(true);
    expect(matchesTimePreference("9-17", 16)).toBe(true);
    expect(matchesTimePreference("9-17", 17)).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(matchesTimePreference("MORNING", 10)).toBe(true);
    expect(matchesTimePreference("Afternoon", 14)).toBe(true);
    expect(matchesTimePreference("Ochtend", 9)).toBe(true);
  });

  it("returns false for unrecognized preferences", () => {
    expect(matchesTimePreference("anytime", 10)).toBe(false);
    expect(matchesTimePreference("", 10)).toBe(false);
    expect(matchesTimePreference("asap", 10)).toBe(false);
  });
});
