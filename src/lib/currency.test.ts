import { describe, expect, it } from "vitest";
import { formatEuroCents, formatEuros } from "@/lib/currency";

describe("Dutch euro display", () => {
  it.each([
    [5701, "€\u00a057,01"],
    [125000, "€\u00a01.250,00"],
    [0, "€\u00a00,00"],
    [-5701, "€\u00a0-57,01"],
  ] as const)("formats %i cents with an exact Dutch euro representation", (cents, expected) => {
    expect(formatEuroCents(cents)).toBe(expected);
  });

  it("handles absent or non-finite values and formats gross-price calculations without modifying their input", () => {
    expect(formatEuroCents(null)).toBe(formatEuroCents(0));
    expect(formatEuroCents(NaN)).toBe(formatEuroCents(0));
    expect(formatEuros(69 / 1.21)).toBe("€\u00a057,02");
  });
});
