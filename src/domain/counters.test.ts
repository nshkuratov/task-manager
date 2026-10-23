import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { TaskFacts } from "@/contracts/task";
import { isOverdue } from "./overdue";
import { countTasks, progressOf } from "./counters";
import { HOUR_MS, NOW, PROPERTY_PARAMS, at, frozen, task, tasksArb } from "./test-fixtures";

describe("countTasks", () => {
  it("R-LIST-2 R-TEST-2: status counts sum to the total", () => {
    const tasks = [
      task({ id: "1", status: "new" }),
      task({ id: "2", status: "new" }),
      task({ id: "3", status: "in_progress" }),
      task({ id: "4", status: "done" }),
    ];
    expect(countTasks(tasks, NOW)).toEqual({ new: 2, inProgress: 1, done: 1, overdue: 0, total: 4 });
  });

  it("R-LIST-2 R-TEST-2: an overdue new task counts in both new and overdue", () => {
    const tasks = frozen([
      task({ id: "1", status: "new", deadline: at(-HOUR_MS) }),
      task({ id: "2", status: "in_progress", deadline: at(-1) }),
      task({ id: "3", status: "in_progress", deadline: NOW }),
    ]);
    expect(countTasks(tasks, NOW)).toEqual({ new: 1, inProgress: 2, done: 0, overdue: 2, total: 3 });
  });

  it("R-LIST-2 R-TEST-2: a done task past its deadline is not overdue", () => {
    const tasks = [task({ id: "1", status: "done", deadline: at(-HOUR_MS) })];
    expect(countTasks(tasks, NOW)).toEqual({ new: 0, inProgress: 0, done: 1, overdue: 0, total: 1 });
  });

  it("R-LIST-2 R-TEST-2: an empty list counts all zeros", () => {
    expect(countTasks([], NOW)).toEqual({ new: 0, inProgress: 0, done: 0, overdue: 0, total: 0 });
  });

  it("R-LIST-2 R-TEST-2: an unknown status throws instead of silently breaking the sum", () => {
    // A drifted DB row is the only way to get here; the type system cannot produce the value.
    const drifted = { ...task({ id: "1" }), status: "archived" } as unknown as TaskFacts;
    expect(() => countTasks([drifted], NOW)).toThrow(/Unknown task status: archived/);
  });

  it("R-LIST-2 R-TEST-2: invariants hold for arbitrary task sets", () => {
    fc.assert(
      fc.property(tasksArb(), (tasks) => {
        const c = countTasks(frozen(tasks), NOW);
        expect(c.total).toBe(tasks.length);
        expect(c.new + c.inProgress + c.done).toBe(c.total);
        expect(c.overdue).toBeLessThanOrEqual(c.total - c.done);
        expect(c.overdue).toBe(tasks.filter((t) => isOverdue(t, NOW)).length);
      }),
      PROPERTY_PARAMS,
    );
  });
});

describe("progressOf", () => {
  it("R-LIST-3 R-TEST-2: an empty list has progress 0, never NaN", () => {
    expect(progressOf(countTasks([], NOW))).toBe(0);
  });

  it("R-LIST-3 R-TEST-2: 2 of 5 done is 0.4", () => {
    expect(progressOf({ new: 2, inProgress: 1, done: 2, overdue: 0, total: 5 })).toBe(0.4);
  });

  it("R-LIST-3 R-TEST-2: all done is 1", () => {
    const tasks = [task({ id: "1", status: "done" }), task({ id: "2", status: "done" })];
    expect(progressOf(countTasks(tasks, NOW))).toBe(1);
  });

  it("R-LIST-3 R-TEST-2: progress stays within [0, 1]", () => {
    fc.assert(
      fc.property(tasksArb(), (tasks) => {
        const p = progressOf(countTasks(tasks, NOW));
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }),
      PROPERTY_PARAMS,
    );
  });
});
