import { describe, expect, it } from "vitest";
import { taskFieldsSchema } from "@/contracts/schemas/tasks";
import { fromDeadlineInstant, toDeadlineInstant } from "./local-deadline";

describe("toDeadlineInstant", () => {
  it("R-TASKS-2: a date alone means 23:59 in the given zone", () => {
    expect(toDeadlineInstant("2026-10-24", undefined, "Europe/Amsterdam")).toBe("2026-10-24T23:59:00+02:00");
    expect(toDeadlineInstant("2026-12-24", undefined, "Europe/Amsterdam")).toBe("2026-12-24T23:59:00+01:00");
  });

  it("uses the given zone, not the process zone (pinned to Europe/Amsterdam in tests)", () => {
    expect(toDeadlineInstant("2026-10-24", "17:00", "UTC")).toBe("2026-10-24T17:00:00+00:00");
    expect(toDeadlineInstant("2026-10-24", "17:00", "Asia/Kolkata")).toBe("2026-10-24T17:00:00+05:30");
    expect(toDeadlineInstant("2026-10-24", "17:00", "America/St_Johns")).toBe("2026-10-24T17:00:00-02:30");
    expect(toDeadlineInstant("2026-12-24", "17:00", "America/St_Johns")).toBe("2026-12-24T17:00:00-03:30");
    expect(toDeadlineInstant("2026-10-24", "17:00", "Asia/Kathmandu")).toBe("2026-10-24T17:00:00+05:45");
    expect(new Date(toDeadlineInstant("2026-10-24", "17:00", "UTC")).toISOString()).toBe("2026-10-24T17:00:00.000Z");
  });

  it("moves a time skipped by spring-forward past the gap", () => {
    expect(toDeadlineInstant("2026-03-29", "02:30", "Europe/Amsterdam")).toBe("2026-03-29T03:30:00+02:00");
    expect(toDeadlineInstant("2026-03-08", "02:30", "America/New_York")).toBe("2026-03-08T03:30:00-04:00");
  });

  it("takes the earlier instant for a time repeated by fall-back", () => {
    expect(toDeadlineInstant("2026-10-25", "02:30", "Europe/Amsterdam")).toBe("2026-10-25T02:30:00+02:00");
    expect(toDeadlineInstant("2026-11-01", "01:30", "America/New_York")).toBe("2026-11-01T01:30:00-04:00");
  });

  it("keeps the exact wall time on either side of a transition", () => {
    expect(toDeadlineInstant("2026-03-29", "01:59", "Europe/Amsterdam")).toBe("2026-03-29T01:59:00+01:00");
    expect(toDeadlineInstant("2026-03-29", "03:00", "Europe/Amsterdam")).toBe("2026-03-29T03:00:00+02:00");
    expect(toDeadlineInstant("2026-10-25", "03:00", "Europe/Amsterdam")).toBe("2026-10-25T03:00:00+01:00");
  });

  it("handles a year below 100 without Date.UTC's 1900 mapping", () => {
    expect(toDeadlineInstant("0099-01-01", "10:00", "UTC")).toBe("0099-01-01T10:00:00+00:00");
  });

  it("produces a value the task schema accepts and parses to the same instant", () => {
    const instant = toDeadlineInstant("2026-10-24", "09:15", "Asia/Kolkata");
    const parsed = taskFieldsSchema.parse({ title: "x", deadline: instant });
    expect(parsed.deadline?.toISOString()).toBe("2026-10-24T03:45:00.000Z");
  });

  it.each([
    ["2026-10-24", "9:15"],
    ["2026-10-24", "24:00"],
    ["2026-02-30", "10:00"],
    ["2026-13-01", "10:00"],
    ["24.10.2026", undefined],
    ["", undefined],
  ])("rejects malformed or impossible input %s %s", (date, time) => {
    expect(() => toDeadlineInstant(date, time, "UTC")).toThrow(RangeError);
  });

  it("rejects an unknown time zone", () => {
    expect(() => toDeadlineInstant("2026-10-24", "10:00", "Mars/Olympus_Mons")).toThrow(RangeError);
  });
});

describe("fromDeadlineInstant", () => {
  it("R-CARD-1: reads the wall clock of an instant in the given zone", () => {
    const instant = new Date("2026-10-24T21:59:00Z");
    expect(fromDeadlineInstant(instant, "Europe/Amsterdam")).toEqual({ date: "2026-10-24", time: "23:59" });
    expect(fromDeadlineInstant(instant, "UTC")).toEqual({ date: "2026-10-24", time: "21:59" });
    expect(fromDeadlineInstant(instant, "Asia/Kolkata")).toEqual({ date: "2026-10-25", time: "03:29" });
  });

  it("tells the two passes through a repeated hour apart only by instant, not by wall time", () => {
    expect(fromDeadlineInstant(new Date("2026-10-25T00:30:00Z"), "Europe/Amsterdam")).toEqual({
      date: "2026-10-25",
      time: "02:30",
    });
    expect(fromDeadlineInstant(new Date("2026-10-25T01:30:00Z"), "Europe/Amsterdam")).toEqual({
      date: "2026-10-25",
      time: "02:30",
    });
  });

  it.each(["Europe/Amsterdam", "Asia/Kolkata", "UTC", "America/New_York"])(
    "round-trips every quarter hour of a DST-free day in %s",
    (timeZone) => {
      for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
        const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        const instant = new Date(toDeadlineInstant("2026-06-15", time, timeZone));
        expect(fromDeadlineInstant(instant, timeZone)).toEqual({ date: "2026-06-15", time });
      }
    },
  );
});
