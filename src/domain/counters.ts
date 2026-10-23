import type { ListCounters, TaskFacts } from "@/contracts/task";
import { isOverdue } from "./overdue";

/**
 * `new`, `inProgress` and `done` count by status and sum to `total`; `overdue` counts tasks where
 * {@link isOverdue} holds (strict `deadline < now`), so it overlaps the non-done counts.
 */
export function countTasks(tasks: readonly TaskFacts[], now: Date): ListCounters {
  const counters: ListCounters = { new: 0, inProgress: 0, done: 0, overdue: 0, total: tasks.length };
  for (const t of tasks) {
    switch (t.status) {
      case "new":
        counters.new++;
        break;
      case "in_progress":
        counters.inProgress++;
        break;
      case "done":
        counters.done++;
        break;
      default: {
        const unhandled: never = t.status;
        throw new Error(`Unknown task status: ${String(unhandled)}`);
      }
    }
    if (isOverdue(t, now)) counters.overdue++;
  }
  return counters;
}

/** `done / total` in `[0, 1]`; `0` (never `NaN`) for an empty list. */
export function progressOf(c: ListCounters): number {
  return c.total === 0 ? 0 : c.done / c.total;
}
