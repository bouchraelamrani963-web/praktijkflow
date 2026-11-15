export const PRACTICE_TIME_ZONE = "Europe/Amsterdam";

const inputFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: PRACTICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Local calendar value for form inputs, independent of the machine timezone. */
export function amsterdamDateTimeInput(date: Date): string {
  const parts = Object.fromEntries(inputFormat.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

/** Resolve a Dutch wall-clock time. During the autumn overlap choose its first occurrence. */
export function parseAmsterdamDateTime(input: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(input)) return null;
  const local = input.length === 16 ? `${input}:00` : input;
  const wallTime = Date.parse(`${local}Z`);
  if (!Number.isFinite(wallTime)) return null;

  const offsets = [-86_400_000, 86_400_000].map((delta) => {
    const sample = wallTime + delta;
    return Date.parse(`${amsterdamDateTimeInput(new Date(sample))}Z`) - sample;
  });
  const candidates = offsets.map((offset) => new Date(wallTime - offset))
    .filter((candidate) => amsterdamDateTimeInput(candidate) === local)
    .sort((a, b) => +a - +b);
  return candidates[0] ?? null;
}

export function amsterdamDateKey(date: Date): string {
  return amsterdamDateTimeInput(date).slice(0, 10);
}

function shiftCalendarDate(day: string, days: number): string {
  const utc = new Date(`${day}T00:00:00Z`);
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function amsterdamDayRange(day: string) {
  const start = parseAmsterdamDateTime(`${day}T00:00`);
  if (!start) return null;
  const end = parseAmsterdamDateTime(`${shiftCalendarDate(day, 1)}T00:00`)!;
  return { start, end };
}

export function amsterdamMonthRange(now: Date) {
  const month = amsterdamDateKey(now).slice(0, 7);
  const next = new Date(`${month}-01T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return {
    start: amsterdamDayRange(`${month}-01`)!.start,
    end: amsterdamDayRange(next.toISOString().slice(0, 10))!.start,
  };
}

export function amsterdamCalendarDayDifference(date: Date, reference: Date): number {
  return (Date.parse(amsterdamDateKey(date)) - Date.parse(amsterdamDateKey(reference))) / 86_400_000;
}

export function formatActionDateTime(date: Date): string {
  return date.toLocaleString("nl-NL", {
    timeZone: PRACTICE_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Accept wire timestamps with offsets, and treat legacy offset-free input as Dutch. */
export function parsePracticeTimestamp(input: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return parseAmsterdamDateTime(`${input}T00:00`);
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(input)) {
    const [local, fraction = ""] = input.replace(" ", "T").split(".");
    const date = parseAmsterdamDateTime(local);
    return date && new Date(+date + Number(fraction.padEnd(3, "0")));
  }
  if (!/[T ]\d{2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(input)) return null;
  const parsed = new Date(input);
  return Number.isFinite(+parsed) ? parsed : null;
}

export function parsePracticeDateFilter(input: string | undefined, throughEndOfDay = false) {
  if (!input) return undefined;
  if (throughEndOfDay && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const range = amsterdamDayRange(input);
    return range ? new Date(+range.end - 1) : undefined;
  }
  return parsePracticeTimestamp(input) ?? undefined;
}
