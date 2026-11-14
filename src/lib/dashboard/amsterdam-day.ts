const timeZone = "Europe/Amsterdam";
const calendar = new Intl.DateTimeFormat("sv-SE", {
  timeZone, year: "numeric", month: "2-digit", day: "2-digit",
});
const offset = new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "longOffset" });

export const AMSTERDAM_TIME_ZONE = timeZone;

function localMidnight(date: Date): Date {
  const zone = offset.formatToParts(date).find((part) => part.type === "timeZoneName")?.value;
  const parts = zone?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!parts) {
    if (zone === "GMT") return date;
    throw new Error("Could not determine Amsterdam time zone offset");
  }
  const [, sign, hours, minutes] = parts;
  const offsetMinutes = (Number(hours) * 60 + Number(minutes)) * (sign === "-" ? -1 : 1);
  return new Date(date.getTime() - offsetMinutes * 60_000);
}

export function amsterdamDateRange(day: string) {
  const midnight = new Date(`${day}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(midnight.getTime()) ||
      midnight.toISOString().slice(0, 10) !== day) return undefined;

  const nextMidnight = new Date(midnight);
  nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
  // Amsterdam changes its UTC offset after midnight. Resolve both boundaries independently.
  return { start: localMidnight(midnight), end: localMidnight(nextMidnight) };
}

export function amsterdamToday(now: Date) {
  const day = calendar.format(now);
  const range = amsterdamDateRange(day);
  if (!range) throw new Error("Could not determine Amsterdam calendar day");
  return { day, ...range };
}
