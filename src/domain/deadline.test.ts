import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { describeDeadline } from "./deadline";
import { isDueSoon, isOverdue } from "./overdue";
import { HOUR_MS, NOW, PROPERTY_PARAMS, at, taskArb } from "./test-fixtures";

describe("describeDeadline", () => {
  it("R-LIST-4: a done task is 'done' whatever its deadline, with deltaMs when dated", () => {
    expect(describeDeadline(at(-HOUR_MS), "done", NOW)).toEqual({ kind: "done", deltaMs: -HOUR_MS });
    expect(describeDeadline(null, "done", NOW)).toEqual({ kind: "done", deltaMs: null });
  });

  it("R-LIST-4: an undated open task is 'none'", () => {
    expect(describeDeadline(null, "new", NOW)).toEqual({ kind: "none", deltaMs: null });
  });

  it("R-LIST-4: 1 ms past is 'overdue' with a negative delta", () => {
    expect(describeDeadline(at(-1), "in_progress", NOW)).toEqual({ kind: "overdue", deltaMs: -1 });
  });

  it("R-LIST-4: exactly now and exactly now + 48 h are 'due-soon'", () => {
    expect(describeDeadline(NOW, "new", NOW)).toEqual({ kind: "due-soon", deltaMs: 0 });
    expect(describeDeadline(at(48 * HOUR_MS), "new", NOW)).toEqual({ kind: "due-soon", deltaMs: 48 * HOUR_MS });
  });

  it("R-LIST-4: now + 48 h + 1 ms is 'upcoming'", () => {
    expect(describeDeadline(at(48 * HOUR_MS + 1), "new", NOW)).toEqual({
      kind: "upcoming",
      deltaMs: 48 * HOUR_MS + 1,
    });
  });

  it("R-LIST-4: kind agrees with isOverdue / isDueSoon for every task", () => {
    fc.assert(
      fc.property(taskArb, (t) => {
        const { kind } = describeDeadline(t.deadline, t.status, NOW);
        expect(kind === "overdue").toBe(isOverdue(t, NOW));
        expect(kind === "due-soon").toBe(isDueSoon(t, NOW));
        expect(kind === "done").toBe(t.status === "done");
        expect(kind === "none").toBe(t.status !== "done" && t.deadline === null);
      }),
      PROPERTY_PARAMS,
    );
  });
});
