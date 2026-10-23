import type { TaskFacts, TaskStatus } from "@/contracts/task";

/**
 * Tasks whose status is in `statuses`, in input order (no sorting). An empty selection means "all" and returns a
 * new array with every task.
 */
export function filterByStatus<T extends TaskFacts>(tasks: readonly T[], statuses: readonly TaskStatus[]): T[] {
  if (statuses.length === 0) return [...tasks];
  const selected = new Set<TaskStatus>(statuses);
  return tasks.filter((t) => selected.has(t.status));
}
