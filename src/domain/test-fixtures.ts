import fc from "fast-check";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskFacts } from "@/contracts/task";

export const NOW = new Date("2026-10-22T12:00:00.000Z");
export const HOUR_MS = 60 * 60 * 1000;

/** The instant `offsetMs` after {@link NOW} (negative = before). */
export function at(offsetMs: number): Date {
  return new Date(NOW.getTime() + offsetMs);
}

/** A task with neutral defaults; `id` is required so two fixtures never silently share one. */
export function task(overrides: Partial<TaskFacts> & Pick<TaskFacts, "id">): TaskFacts {
  return { title: "Task", status: "new", priority: "medium", deadline: null, ...overrides };
}

const BOUNDARY_OFFSETS_MS = [0, -1, 1, -48 * HOUR_MS, 48 * HOUR_MS, 48 * HOUR_MS - 1, 48 * HOUR_MS + 1];

/** Fixed so a property failure reproduces; fast-check prints the seed and counterexample on failure. */
export const PROPERTY_PARAMS = { seed: 20261022, numRuns: 500 } as const;

const deadlineArb = fc.oneof(
  fc.constant(null),
  fc.constantFrom(...BOUNDARY_OFFSETS_MS).map(at),
  fc.integer({ min: -7 * 24 * HOUR_MS, max: 7 * 24 * HOUR_MS }).map(at),
);

/** Arbitrary task near {@link NOW}: null and boundary deadlines, duplicate and case-only-different titles. */
export const taskArb: fc.Arbitrary<TaskFacts> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 4 }),
  title: fc.constantFrom("Alpha", "alpha", "Beta", "Task 2", "Task 10", "Écrire"),
  status: fc.constantFrom(...TASK_STATUSES),
  priority: fc.constantFrom(...TASK_PRIORITIES),
  deadline: deadlineArb,
});

/** Tasks with unique ids (the comparator's tie-break contract). */
export const tasksArb = (minLength = 0) => fc.uniqueArray(taskArb, { selector: (t) => t.id, minLength, maxLength: 12 });

/** Freezes the array and every element, so a mutating implementation throws. */
export function frozen<T extends object>(items: readonly T[]): readonly T[] {
  return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}
