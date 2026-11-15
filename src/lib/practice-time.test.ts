import { describe, expect, it } from "vitest";
import {
  amsterdamCalendarDayDifference,
  amsterdamDateTimeInput,
  amsterdamDayRange,
  amsterdamMonthRange,
  formatActionDateTime,
  parseAmsterdamDateTime,
  parsePracticeDateFilter,
  parsePracticeTimestamp,
} from "@/lib/practice-time";

describe("Europe/Amsterdam appointment time", () => {
  it.each([
    ["2026-11-18", "09:00"],
    ["2026-07-18", "08:00"],
    ["2026-03-29", "08:00"],
    ["2026-10-25", "09:00"],
  ])("shows 10:00 in the practice for %s", (date, utcTime) => {
    const instant = parseAmsterdamDateTime(`${date}T10:00`)!;
    expect(instant.toISOString()).toBe(`${date}T${utcTime}:00.000Z`);
    expect(amsterdamDateTimeInput(instant)).toBe(`${date}T10:00:00`);
    expect(formatActionDateTime(instant)).toContain("10:00");
  });

  it("rejects nonexistent spring times and chooses the first occurrence in the autumn overlap", () => {
    expect(parseAmsterdamDateTime("2026-03-29T02:30")).toBeNull();
    expect(parseAmsterdamDateTime("2026-10-25T02:30")?.toISOString()).toBe("2026-10-25T00:30:00.000Z");
    expect(parsePracticeTimestamp("2026-10-25T02:30:00+01:00")?.toISOString()).toBe("2026-10-25T01:30:00.000Z");
  });

  it("uses 23- and 25-hour days and the Dutch date at UTC midnight boundaries", () => {
    const spring = amsterdamDayRange("2026-03-29")!;
    const autumn = amsterdamDayRange("2026-10-25")!;
    expect(+spring.end - +spring.start).toBe(23 * 3_600_000);
    expect(+autumn.end - +autumn.start).toBe(25 * 3_600_000);
    expect(parsePracticeDateFilter("2026-10-25", true)?.toISOString()).toBe("2026-10-25T22:59:59.999Z");
    const now = new Date("2026-10-31T23:20:00Z");
    expect(amsterdamMonthRange(now).start.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(amsterdamCalendarDayDifference(now, new Date("2026-10-31T22:55:00Z"))).toBe(1);
  });
});
