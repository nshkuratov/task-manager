import { TASK_PRIORITIES, type TaskFacts } from "@/contracts/task";
import { isOverdue } from "./overdue";

// A fixed locale keeps the order identical on every host, whatever its default locale.
const titleCollator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

function bandOf(t: TaskFacts, now: Date): number {
  if (isOverdue(t, now)) return 0;
  return t.status === "done" ? 2 : 1;
}

function compareDeadlines(a: Date | null, b: Date | null): number {
  if (a === null || b === null) {
    if (a === b) return 0;
    return a === null ? 1 : -1;
  }
  return a.getTime() - b.getTime();
}

/**
 * Total order for tasks: band (unfinished overdue — `deadline < now`, strict — then unfinished, then `done`), then
 * deadline ascending by exact instant with undated tasks after dated ones, then priority high → low, then title
 * (case-, accent-insensitive, numeric-aware), then `id` by plain code-unit comparison. Returns `0` only for equal
 * ids.
 */
export function compareTasks(a: TaskFacts, b: TaskFacts, now: Date): number {
  return (
    bandOf(a, now) - bandOf(b, now) ||
    compareDeadlines(a.deadline, b.deadline) ||
    TASK_PRIORITIES.indexOf(a.priority) - TASK_PRIORITIES.indexOf(b.priority) ||
    titleCollator.compare(a.title, b.title) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/** Returns a new array ordered by {@link compareTasks}; the input is never mutated. */
export function sortTasks<T extends TaskFacts>(tasks: readonly T[], now: Date): T[] {
  return [...tasks].sort((a, b) => compareTasks(a, b, now));
}
