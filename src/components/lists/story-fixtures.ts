import type { ListCounters, ListIndicator, ListSummary, TaskList } from "@/contracts/task";

const CREATED = new Date("2026-10-20T09:00:00Z");

export const LIST_IDS = {
  launch: "e2b03091-f72d-41f9-a8d1-332c78332780",
  home: "aa6efe8c-a5b2-4acd-9ed4-b3eb2a95186d",
  reading: "e6cfc6ce-6be8-4f93-ac46-999a3c110b2e",
  someday: "a7f42162-a14c-4520-a382-01b2ac1f5703",
  groceries: "c0e5ecb1-8521-422c-91fa-0f88e98c811c",
} as const;

export const LIST_GONE = "This list no longer exists.";

export function taskList(id: string, name: string): TaskList {
  return { id, name, createdAt: CREATED, updatedAt: CREATED };
}

/** A summary as the query builds it; `overdue` overlaps the other counters, as in the domain. */
export function listSummary(
  id: string,
  name: string,
  counts: Omit<ListCounters, "total">,
  indicator: ListIndicator,
): ListSummary {
  const total = counts.new + counts.inProgress + counts.done;
  return {
    list: taskList(id, name),
    counters: { ...counts, total },
    progress: total === 0 ? 0 : counts.done / total,
    indicator,
  };
}

export const SUMMARIES = {
  overdue: listSummary(LIST_IDS.launch, "Product launch", { new: 2, inProgress: 2, done: 1, overdue: 1 }, "overdue"),
  dueSoon: listSummary(LIST_IDS.home, "Home renovation", { new: 3, inProgress: 1, done: 1, overdue: 0 }, "due-soon"),
  neutral: listSummary(LIST_IDS.reading, "Reading list", { new: 0, inProgress: 0, done: 4, overdue: 0 }, "none"),
  empty: listSummary(LIST_IDS.someday, "Someday", { new: 0, inProgress: 0, done: 0, overdue: 0 }, "none"),
};

export const ALL_SUMMARIES = [SUMMARIES.overdue, SUMMARIES.dueSoon, SUMMARIES.neutral, SUMMARIES.empty];
