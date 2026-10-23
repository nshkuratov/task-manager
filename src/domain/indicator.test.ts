import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { indicatorOf } from "./indicator";
import { isDueSoon, isOverdue } from "./overdue";
import { HOUR_MS, NOW, PROPERTY_PARAMS, at, frozen, task, tasksArb } from "./test-fixtures";

describe("indicatorOf", () => {
  it("R-LIST-4: an overdue task makes the list red", () => {
    expect(indicatorOf([task({ id: "1", deadline: at(-1) })], NOW)).toBe("overdue");
  });

  it("R-LIST-4: only a task due within 48 h makes the list yellow", () => {
    expect(indicatorOf([task({ id: "1", deadline: at(48 * HOUR_MS) })], NOW)).toBe("due-soon");
  });

  it("R-LIST-4: overdue and due-soon together → red wins", () => {
    const tasks = frozen([task({ id: "1", deadline: at(HOUR_MS) }), task({ id: "2", deadline: at(-HOUR_MS) })]);
    expect(indicatorOf(tasks, NOW)).toBe("overdue");
  });

  it("R-LIST-4: done tasks never trigger either colour", () => {
    const tasks = [
      task({ id: "1", status: "done", deadline: at(-HOUR_MS) }),
      task({ id: "2", status: "done", deadline: at(HOUR_MS) }),
    ];
    expect(indicatorOf(tasks, NOW)).toBe("none");
  });

  it("R-LIST-4: no deadlines in range → none; empty list → none", () => {
    expect(indicatorOf([task({ id: "1", deadline: at(48 * HOUR_MS + 1) }), task({ id: "2" })], NOW)).toBe("none");
    expect(indicatorOf([], NOW)).toBe("none");
  });

  it("R-LIST-4: matches the definition computed from isOverdue / isDueSoon", () => {
    fc.assert(
      fc.property(tasksArb(), (tasks) => {
        const expected = tasks.some((t) => isOverdue(t, NOW))
          ? "overdue"
          : tasks.some((t) => isDueSoon(t, NOW))
            ? "due-soon"
            : "none";
        expect(indicatorOf(frozen(tasks), NOW)).toBe(expected);
      }),
      PROPERTY_PARAMS,
    );
  });
});
