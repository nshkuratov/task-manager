export const TASK_STATUSES = ["new", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Listed high → low: the display order and the sort tie-breaker order. */
export const TASK_PRIORITIES = ["high", "medium", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: "New",
  in_progress: "In progress",
  done: "Done",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export interface TaskList {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The minimal projection every domain rule needs. */
export type TaskFacts = Pick<Task, "id" | "title" | "status" | "priority" | "deadline">;

/** `new + inProgress + done = total`; `overdue` overlaps the non-done counts. */
export interface ListCounters {
  new: number;
  inProgress: number;
  done: number;
  overdue: number;
  total: number;
}

export type ListIndicator = "overdue" | "due-soon" | "none";

export interface ListSummary {
  list: TaskList;
  counters: ListCounters;
  /** `done / total` in `[0, 1]`; `0` for an empty list. */
  progress: number;
  indicator: ListIndicator;
}
