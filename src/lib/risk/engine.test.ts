import { describe, it, expect } from "vitest";
import { calculateRisk, scoreToLevel, type RiskContext } from "./engine";

const NOW = new Date("2026-04-10T10:00:00Z");

function ctx(overrides: Partial<RiskContext> = {}): RiskContext {
  return {
    priorNoShows: 0,
    priorCancellations: 0,
    priorCompletedVisits: 0,
    isNewClient: false,
    startTime: new Date("2026-04-15T09:00:00Z"), // Wednesday, 5 days out
    status: "SCHEDULED",
    now: NOW,
    ...overrides,
  };
}

describe("scoreToLevel", () => {
  it("maps 0–19 to LOW", () => {
    expect(scoreToLevel(0)).toBe("LOW");
    expect(scoreToLevel(19)).toBe("LOW");
  });
  it("maps 20–39 to MEDIUM", () => {
    expect(scoreToLevel(20)).toBe("MEDIUM");
    expect(scoreToLevel(39)).toBe("MEDIUM");
  });
  it("maps 40–59 to HIGH", () => {
    expect(scoreToLevel(40)).toBe("HIGH");
    expect(scoreToLevel(59)).toBe("HIGH");
  });
  it("maps 60+ to CRITICAL", () => {
    expect(scoreToLevel(60)).toBe("CRITICAL");
    expect(scoreToLevel(100)).toBe("CRITICAL");
  });
});

describe("calculateRisk", () => {
  it("returns LOW for a clean appointment", () => {
    const result = calculateRisk(ctx());
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe("LOW");
    expect(result.factors).toHaveLength(0);
  });

  it("adds +20 per prior no-show", () => {
    const result = calculateRisk(ctx({ priorNoShows: 2 }));
    expect(result.riskScore).toBe(40);
    expect(result.riskLevel).toBe("HIGH");
    expect(result.factors).toContain("2 prior no-show(s) (+40)");
  });

  it("adds +8 per prior cancellation", () => {
    const result = calculateRisk(ctx({ priorCancellations: 3 }));
    expect(result.riskScore).toBe(24);
    expect(result.riskLevel).toBe("MEDIUM");
  });

  it("adds +15 for >30 days out", () => {
    // 52 days from NOW (2026-04-10) — use a Wednesday to avoid day-of-week bonuses
    const farWednesday = new Date("2026-06-03T09:00:00Z"); // Wednesday
    const result = calculateRisk(ctx({ startTime: farWednesday }));
    expect(result.riskScore).toBe(15);
    expect(result.factors.some((f) => f.includes(">30 days"))).toBe(true);
  });

  it("does NOT add >30 days for appointment 5 days out", () => {
    const result = calculateRisk(ctx());
    expect(result.factors.some((f) => f.includes(">30 days"))).toBe(false);
  });

  it("adds +10 for new client", () => {
    const result = calculateRisk(ctx({ isNewClient: true }));
    expect(result.riskScore).toBe(10);
    expect(result.factors).toContain("New client (+10)");
  });

  it("adds +5 for Monday", () => {
    // 2026-04-13 is a Monday
    const result = calculateRisk(
      ctx({ startTime: new Date("2026-04-13T09:00:00Z") }),
    );
    expect(result.riskScore).toBe(5);
    expect(result.factors).toContain("Monday appointment (+5)");
  });

  it("adds +10 for Friday after 15:00", () => {
    // 2026-04-17 is a Friday
    const result = calculateRisk(
      ctx({ startTime: new Date("2026-04-17T16:00:00Z") }),
    );
    expect(result.riskScore).toBe(10);
    expect(result.factors).toContain("Friday after 15:00 (+10)");
  });

  it("does NOT add Friday bonus before 15:00", () => {
    const result = calculateRisk(
      ctx({ startTime: new Date("2026-04-17T10:00:00Z") }),
    );
    expect(result.riskScore).toBe(0);
  });

  it("subtracts -15 for CONFIRMED status", () => {
    const result = calculateRisk(ctx({ status: "CONFIRMED", priorNoShows: 1 }));
    // 20 (no-show) - 15 (confirmed) = 5
    expect(result.riskScore).toBe(5);
    expect(result.factors).toContain("Confirmed status (-15)");
  });

  it("subtracts -3 per completed visit, max -30", () => {
    const result = calculateRisk(ctx({ priorCompletedVisits: 5 }));
    // 0 - 15 = clamped to 0
    expect(result.riskScore).toBe(0);

    // With some positive factors to see the subtraction
    const result2 = calculateRisk(
      ctx({ priorNoShows: 2, priorCompletedVisits: 5 }),
    );
    // 40 - 15 = 25
    expect(result2.riskScore).toBe(25);
    expect(result2.factors).toContain("5 completed visit(s) (-15)");
  });

  it("caps completed visit reduction at -30", () => {
    const result = calculateRisk(
      ctx({ priorNoShows: 3, priorCompletedVisits: 20 }),
    );
    // 60 - 30 = 30
    expect(result.riskScore).toBe(30);
    expect(result.factors).toContain("20 completed visit(s) (-30)");
  });

  it("clamps score to 0 minimum", () => {
    const result = calculateRisk(
      ctx({ status: "CONFIRMED", priorCompletedVisits: 10 }),
    );
    // -15 - 30 → clamped to 0
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe("LOW");
  });

  it("clamps score to 100 maximum", () => {
    const result = calculateRisk(
      ctx({
        priorNoShows: 5,      // +100
        priorCancellations: 5, // +40
        isNewClient: true,     // +10
      }),
    );
    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe("CRITICAL");
  });

  it("combines multiple factors correctly", () => {
    // New client + Monday + 1 no-show
    const result = calculateRisk(
      ctx({
        isNewClient: true,
        priorNoShows: 1,
        startTime: new Date("2026-04-13T09:00:00Z"), // Monday
      }),
    );
    // 20 + 10 + 5 = 35
    expect(result.riskScore).toBe(35);
    expect(result.riskLevel).toBe("MEDIUM");
    expect(result.factors).toHaveLength(3);
  });
});
