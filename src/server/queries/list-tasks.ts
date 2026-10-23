import "server-only";
import { type ListSummary, type Task, type TaskList, type TaskStatus } from "@/contracts";
import { filterByStatus, sortTasks, summarizeList } from "@/domain";
import type { Repositories } from "@/server/repositories";

export interface ListWithTasks {
  list: TaskList;
  /** Counters, progress and indicator over every task in the list, whatever the filter. */
  summary: ListSummary;
  /** The tasks matching the filter, in urgency order. */
  tasks: Task[];
  totalUnfiltered: number;
  /** Per-status counts over every task, so the filter can show what each choice would reveal. */
  countsByStatus: Record<TaskStatus, number>;
}

export interface ListWithTasksOptions {
  /** Omitted or empty means no filter. */
  statuses?: readonly TaskStatus[] | undefined;
  now: Date;
}

/** One list's page data; `null` when the list does not exist or belongs to someone else. */
export async function getListWithTasks(
  repos: Pick<Repositories, "lists" | "tasks">,
  userId: string,
  listId: string,
  { statuses = [], now }: ListWithTasksOptions,
): Promise<ListWithTasks | null> {
  const [list, all] = await Promise.all([repos.lists.get(userId, listId), repos.tasks.listForList(userId, listId)]);
  // Both are ownership-scoped; a list deleted between the two reads makes either one null.
  if (list === null || all === null) return null;

  const summary = summarizeList(list, all, now);
  const { counters } = summary;
  return {
    list,
    summary,
    tasks: sortTasks(filterByStatus(all, statuses), now),
    totalUnfiltered: counters.total,
    countsByStatus: { new: counters.new, in_progress: counters.inProgress, done: counters.done },
  };
}
