import { TASK_STATUSES, type TaskStatus } from "@/contracts";

/** The list URL for a status selection, in the comma form `tasksSearchParamsSchema` parses; none selected = no query. */
export function statusFilterHref(pathname: string, statuses: readonly TaskStatus[]): string {
  const selected = TASK_STATUSES.filter((status) => statuses.includes(status));
  return selected.length === 0 ? pathname : `${pathname}?status=${selected.join(",")}`;
}
