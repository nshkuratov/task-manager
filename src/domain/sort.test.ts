import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { TaskFacts } from "@/contracts/task";
import { isOverdue } from "./overdue";
import { compareTasks, sortTasks } from "./sort";
import { HOUR_MS, NOW, PROPERTY_PARAMS, at, frozen, task, tasksArb } from "./test-fixtures";

const ids = (tasks: readonly TaskFacts[]) => tasks.map((t) => t.id);

describe("sortTasks — examples", () => {
  it("R-SORT-1 R-TEST-2: an unfinished overdue task comes before a higher-priority open task", () => {
    const open = task({ id: "open", deadline: at(HOUR_MS), priority: "high" });
    const overdue = task({ id: "overdue", deadline: at(-HOUR_MS), priority: "low" });
    expect(ids(sortTasks([open, overdue], NOW))).toEqual(["overdue", "open"]);
  });

  it("R-SORT-1 R-SORT-2 R-TEST-2: the most overdue task leads the overdue band", () => {
    const slightly = task({ id: "slightly", deadline: at(-1) });
    const very = task({ id: "very", deadline: at(-72 * HOUR_MS) });
    expect(ids(sortTasks([slightly, very], NOW))).toEqual(["very", "slightly"]);
  });

  it("R-SORT-2 R-TEST-2: a nearer deadline sorts higher than a later one, regardless of priority", () => {
    const later = task({ id: "later", deadline: at(72 * HOUR_MS), priority: "high" });
    const nearer = task({ id: "nearer", deadline: at(HOUR_MS), priority: "low" });
    expect(ids(sortTasks([later, nearer], NOW))).toEqual(["nearer", "later"]);
  });

  it("R-SORT-3 R-TEST-2: at the same instant, priority decides high > medium > low", () => {
    const deadline = at(HOUR_MS);
    const low = task({ id: "low", deadline, priority: "low" });
    const high = task({ id: "high", deadline, priority: "high" });
    const medium = task({ id: "medium", deadline, priority: "medium" });
    expect(ids(sortTasks([low, medium, high], NOW))).toEqual(["high", "medium", "low"]);
  });

  it("R-SORT-3 R-TEST-2: priority outranks title when the two disagree", () => {
    const deadline = at(HOUR_MS);
    const zebraHigh = task({ id: "1", title: "Zebra", deadline, priority: "high" });
    const appleLow = task({ id: "2", title: "apple", deadline, priority: "low" });
    expect(ids(sortTasks([appleLow, zebraHigh], NOW))).toEqual(["1", "2"]);
  });

  it("R-SORT-4 R-TEST-2: done tasks come last, even when their deadline has passed", () => {
    const doneOverdue = task({ id: "done", status: "done", deadline: at(-72 * HOUR_MS), priority: "high" });
    const openUndated = task({ id: "open", deadline: null, priority: "low" });
    expect(ids(sortTasks([doneOverdue, openUndated], NOW))).toEqual(["open", "done"]);
  });

  it("R-SORT-4 R-TEST-2: done tasks are ordered among themselves by the same comparator", () => {
    const tasks = [
      task({ id: "d-undated", status: "done" }),
      task({ id: "d-late", status: "done", deadline: at(HOUR_MS) }),
      task({ id: "d-early-low", status: "done", deadline: at(-HOUR_MS), priority: "low" }),
      task({ id: "d-early-high", status: "done", deadline: at(-HOUR_MS), priority: "high" }),
    ];
    expect(ids(sortTasks(tasks, NOW))).toEqual(["d-early-high", "d-early-low", "d-late", "d-undated"]);
  });

  it("R-SORT-2 R-TEST-2: undated tasks sort after dated ones within their band", () => {
    const undated = task({ id: "undated", priority: "high" });
    const dated = task({ id: "dated", deadline: at(300 * HOUR_MS), priority: "low" });
    expect(ids(sortTasks([undated, dated], NOW))).toEqual(["dated", "undated"]);
  });

  it("R-SORT-3 R-TEST-2: identical keys fall back to title (case-insensitive, numeric-aware)", () => {
    const deadline = at(HOUR_MS);
    const tasks = [
      task({ id: "1", title: "Task 10", deadline }),
      task({ id: "2", title: "Banana", deadline }),
      task({ id: "3", title: "Task 2", deadline }),
      task({ id: "4", title: "apple", deadline }),
    ];
    expect(sortTasks(tasks, NOW).map((t) => t.title)).toEqual(["apple", "Banana", "Task 2", "Task 10"]);
  });

  it("R-SORT-3 R-TEST-2: equal titles fall back to id by plain code units, not the collator", () => {
    const a = task({ id: "a", title: "Same" });
    const upperB = task({ id: "B", title: "same" });
    expect(ids(sortTasks([a, upperB], NOW))).toEqual(["B", "a"]);
  });

  it("R-SORT-1 R-TEST-2: the input array is not mutated", () => {
    const input = frozen([task({ id: "b", deadline: at(HOUR_MS) }), task({ id: "a", deadline: at(-HOUR_MS) })]);
    const result = sortTasks(input, NOW);
    expect(result).not.toBe(input);
    expect(ids(input)).toEqual(["b", "a"]);
    expect(ids(result)).toEqual(["a", "b"]);
  });

  it("R-SORT-1 R-TEST-2: empty and single-element inputs", () => {
    expect(sortTasks([], NOW)).toEqual([]);
    const only = task({ id: "only" });
    expect(sortTasks([only], NOW)).toEqual([only]);
  });
});

describe("compareTasks — properties", () => {
  it("R-SORT-1 R-SORT-2 R-SORT-3 R-SORT-4 R-TEST-2: antisymmetric, and 0 only for the same id", () => {
    fc.assert(
      fc.property(tasksArb(2), ([a, b]) => {
        if (!a || !b) return;
        expect(Math.sign(compareTasks(a, b, NOW))).toBe(-Math.sign(compareTasks(b, a, NOW)));
        expect(compareTasks(a, b, NOW)).not.toBe(0);
        expect(compareTasks(a, a, NOW)).toBe(0);
      }),
      PROPERTY_PARAMS,
    );
  });

  it("R-SORT-1 R-SORT-2 R-SORT-3 R-SORT-4 R-TEST-2: transitive on sampled triples", () => {
    fc.assert(
      fc.property(tasksArb(3), ([a, b, c]) => {
        if (!a || !b || !c) return;
        if (compareTasks(a, b, NOW) < 0 && compareTasks(b, c, NOW) < 0) {
          expect(compareTasks(a, c, NOW)).toBeLessThan(0);
        }
      }),
      PROPERTY_PARAMS,
    );
  });

  it("R-SORT-1 R-SORT-4 R-TEST-2: sortTasks is a sorted permutation with overdue first and done last", () => {
    fc.assert(
      fc.property(tasksArb(), (tasks) => {
        const sorted = sortTasks(frozen(tasks), NOW);
        expect([...ids(sorted)].sort()).toEqual([...ids(tasks)].sort());
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const cur = sorted[i];
          if (!prev || !cur) continue;
          expect(compareTasks(prev, cur, NOW)).toBeLessThan(0);
          if (prev.status === "done") expect(cur.status).toBe("done");
          if (cur.status !== "done" && isOverdue(cur, NOW)) expect(isOverdue(prev, NOW)).toBe(true);
        }
      }),
      PROPERTY_PARAMS,
    );
  });
});
