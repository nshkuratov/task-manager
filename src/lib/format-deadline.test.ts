import { describe, expect, it } from "vitest";
import { describeDeadline } from "@/domain/deadline";
import { DISPLAY_LOCALE, formatDeadline, formatRelative } from "./format-deadline";

const NOW = new Date("2026-10-22T10:00:00Z");
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);
const relative = (offsetMs: number, status: "new" | "done" = "new") =>
  formatRelative(describeDeadline(at(offsetMs), status, NOW), { locale: DISPLAY_LOCALE });

describe("formatDeadline", () => {
  const options = { locale: DISPLAY_LOCALE, now: NOW };

  it("formats weekday, day, month and 24-hour time in the given zone, without the current year", () => {
    const deadline = new Date("2026-10-24T15:00:00Z");
    expect(formatDeadline(deadline, { ...options, timeZone: "Europe/Amsterdam" })).toBe("Sat 24 Oct, 17:00");
    expect(formatDeadline(deadline, { ...options, timeZone: "Asia/Kolkata" })).toBe("Sat 24 Oct, 20:30");
    expect(formatDeadline(deadline, { ...options, timeZone: "UTC" })).toBe("Sat 24 Oct, 15:00");
  });

  it("renders midnight as 00:00, not 24:00", () => {
    expect(formatDeadline(new Date("2026-10-24T00:00:00Z"), { ...options, timeZone: "UTC" })).toBe("Sat 24 Oct, 00:00");
  });

  it("adds the year only when it differs from now's year in that zone", () => {
    expect(formatDeadline(new Date("2027-01-01T09:00:00Z"), { ...options, timeZone: "UTC" })).toBe(
      "Fri, 1 Jan 2027, 09:00",
    );
    const newYearsEveUtc = new Date("2026-12-31T23:30:00Z");
    expect(formatDeadline(newYearsEveUtc, { ...options, timeZone: "UTC" })).toBe("Thu 31 Dec, 23:30");
    expect(formatDeadline(newYearsEveUtc, { ...options, timeZone: "Asia/Kolkata" })).toBe("Fri, 1 Jan 2027, 05:00");
  });

  it("labels the zone only when asked to (the UTC fallback)", () => {
    const deadline = new Date("2026-10-24T15:00:00Z");
    expect(formatDeadline(deadline, { ...options, timeZone: "UTC", showTimeZone: true })).toBe("Sat 24 Oct, 15:00 UTC");
  });
});

describe("formatRelative", () => {
  it("R-TASKS-1: reads upcoming deadlines forward in the largest whole unit, floored", () => {
    expect(relative(5 * HOUR + 40 * MINUTE)).toBe("in 5 hours");
    expect(relative(HOUR)).toBe("in 1 hour");
    expect(relative(59 * MINUTE + 59_999)).toBe("in 59 minutes");
    expect(relative(DAY)).toBe("in 1 day");
    expect(relative(47 * HOUR)).toBe("in 1 day");
    expect(relative(10 * DAY)).toBe("in 10 days");
  });

  it("R-TASKS-1: reads overdue deadlines as an amount overdue, floored on the magnitude", () => {
    expect(relative(-2 * DAY - 3 * HOUR)).toBe("2 days overdue");
    expect(relative(-90 * MINUTE)).toBe("1 hour overdue");
    expect(relative(-MINUTE)).toBe("1 minute overdue");
    expect(relative(-DAY)).toBe("1 day overdue");
  });

  it("says 'less than a minute' at the boundary instead of zero", () => {
    expect(relative(0)).toBe("in less than a minute");
    expect(relative(59_999)).toBe("in less than a minute");
    expect(relative(-1)).toBe("less than a minute overdue");
  });

  it("says 'No deadline' for an undated task and nothing for a done one", () => {
    expect(formatRelative(describeDeadline(null, "new", NOW), { locale: DISPLAY_LOCALE })).toBe("No deadline");
    expect(relative(-DAY, "done")).toBeNull();
    expect(formatRelative(describeDeadline(null, "done", NOW), { locale: DISPLAY_LOCALE })).toBeNull();
  });
});
