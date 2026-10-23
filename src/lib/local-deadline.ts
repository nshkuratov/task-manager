const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** A date entered without a time means the end of that day in the viewer's zone. */
export const DEFAULT_DEADLINE_TIME = "23:59";

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Milliseconds since the epoch of a wall-clock reading, as if that reading were UTC. */
function wallAsUtc(year: number, month: number, day: number, hour: number, minute: number, second = 0): number {
  const date = new Date(0);
  // setUTCFullYear, not Date.UTC: Date.UTC maps years 0–99 to 1900–1999.
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}

/** The zone's UTC offset at `instantMs`, in milliseconds (east of UTC is positive). */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const part of partsFormatter(timeZone).formatToParts(instantMs)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const wall = wallAsUtc(
    parts.year ?? 0,
    parts.month ?? 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  const flooredInstant = Math.floor(instantMs / 1000) * 1000;
  return wall - flooredInstant;
}

const pad = (value: number, width = 2) => String(value).padStart(width, "0");

function formatOffset(offsetMs: number): string {
  const sign = offsetMs < 0 ? "-" : "+";
  const minutes = Math.abs(Math.round(offsetMs / MINUTE_MS));
  return `${sign}${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function wallParts(instantMs: number, timeZone: string) {
  const wall = new Date(instantMs + zoneOffsetMs(instantMs, timeZone));
  return {
    date: `${pad(wall.getUTCFullYear(), 4)}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}`,
    time: `${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`,
  };
}

/**
 * Converts a wall-clock date (and optional time) in `timeZone` into an ISO-8601 instant carrying that
 * zone's offset, e.g. `2026-10-24T23:59:00+02:00`. A missing time means 23:59. The process zone is never
 * consulted, so a UTC server and the viewer's browser produce the same string.
 *
 * DST follows JavaScript's "compatible" disambiguation: a time skipped by a spring-forward gap moves
 * forward by the gap's length; a time repeated by a fall-back overlap takes the earlier instant.
 *
 * @throws RangeError when `date` is not `YYYY-MM-DD`, `time` is not `HH:mm`, either is out of range, or
 *   `timeZone` is not a valid IANA zone.
 */
export function toDeadlineInstant(date: string, time: string | undefined, timeZone: string): string {
  const dateMatch = DATE_RE.exec(date);
  const timeMatch = TIME_RE.exec(time ?? DEFAULT_DEADLINE_TIME);
  if (dateMatch === null || timeMatch === null) {
    throw new RangeError(`Invalid deadline: ${JSON.stringify(date)} ${JSON.stringify(time)}`);
  }
  const [year, month, day] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])];
  const [hour, minute] = [Number(timeMatch[1]), Number(timeMatch[2])];
  const wall = wallAsUtc(year, month, day, hour, minute);
  const check = new Date(wall);
  if (
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    throw new RangeError(`Invalid deadline: ${date} ${time ?? ""}`.trim());
  }

  const offsetBefore = zoneOffsetMs(wall - DAY_MS, timeZone);
  const offsetAfter = zoneOffsetMs(wall + DAY_MS, timeZone);
  const valid = [offsetBefore, offsetAfter]
    .map((offset) => wall - offset)
    .filter((instant) => wall - instant === zoneOffsetMs(instant, timeZone));
  // Overlap: two valid instants, take the earlier. Gap: none, so read the wall time with the offset in
  // force before the transition, which lands the same distance past it.
  const instant = valid.length > 0 ? Math.min(...valid) : wall - offsetBefore;

  const { date: localDate, time: localTime } = wallParts(instant, timeZone);
  return `${localDate}T${localTime}:00${formatOffset(zoneOffsetMs(instant, timeZone))}`;
}

/** The wall-clock `{ date: "YYYY-MM-DD", time: "HH:mm" }` of `instant` in `timeZone`. */
export function fromDeadlineInstant(instant: Date, timeZone: string): { date: string; time: string } {
  return wallParts(instant.getTime(), timeZone);
}
