import type { DeadlineDescription } from "@/domain/deadline";

/**
 * The one locale every deadline is rendered in, on the server and in the browser alike. The surrounding
 * copy ("No deadline", "overdue") is English, so a different locale would produce mixed-language text and
 * a server/client mismatch.
 */
export const DISPLAY_LOCALE = "en-GB";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export interface FormatDeadlineOptions {
  locale: string;
  timeZone: string;
  /** The request's clock reading; the year is shown only when the deadline falls in a different year. */
  now: Date;
  /** Appends the zone name ("UTC"), for when the zone is a fallback rather than the viewer's own. */
  showTimeZone?: boolean;
}

function yearIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric" }).format(date);
}

/** Absolute viewer-local text, e.g. "Sat 24 Oct, 17:00" or "Fri, 1 Jan 2027, 09:00". */
export function formatDeadline(date: Date, { locale, timeZone, now, showTimeZone = false }: FormatDeadlineOptions) {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(yearIn(date, timeZone) === yearIn(now, timeZone) ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(showTimeZone ? { timeZoneName: "short" } : {}),
  }).format(date);
}

function largestUnit(absMs: number): { value: number; unit: "minute" | "hour" | "day" } {
  if (absMs < HOUR_MS) return { value: Math.floor(absMs / MINUTE_MS), unit: "minute" };
  if (absMs < DAY_MS) return { value: Math.floor(absMs / HOUR_MS), unit: "hour" };
  return { value: Math.floor(absMs / DAY_MS), unit: "day" };
}

/**
 * Relative text for a described deadline: "in 5 hours", "2 days overdue", "No deadline". Values are floored
 * in the largest whole unit (minutes under an hour, hours under a day, then days), so the text never
 * overstates the time left or the time overdue. `null` for a done task: nothing is pending.
 */
export function formatRelative({ kind, deltaMs }: DeadlineDescription, { locale }: { locale: string }): string | null {
  if (kind === "done") return null;
  if (kind === "none" || deltaMs === null) return "No deadline";

  const absMs = Math.abs(deltaMs);
  const overdue = kind === "overdue";
  if (absMs < MINUTE_MS) return overdue ? "less than a minute overdue" : "in less than a minute";

  const { value, unit } = largestUnit(absMs);
  if (overdue) {
    const amount = new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long" }).format(value);
    return `${amount} overdue`;
  }
  return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(value, unit);
}
