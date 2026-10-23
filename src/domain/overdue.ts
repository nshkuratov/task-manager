import type { TaskFacts } from "@/contracts/task";

/** The yellow-indicator look-ahead: 48 hours, in milliseconds. */
export const DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

type DeadlineFacts = Pick<TaskFacts, "status" | "deadline">;

/**
 * Overdue iff the task is not `done`, has a deadline, and `deadline < now` (**strict**): a task due exactly at
 * `now` is not yet overdue — it is due soon. Undated and `done` tasks are never overdue.
 */
export function isOverdue(t: DeadlineFacts, now: Date): boolean {
  return t.status !== "done" && t.deadline !== null && t.deadline.getTime() < now.getTime();
}

/**
 * Due soon iff the task is not `done`, has a deadline, and `now <= deadline <= now + 48h` (**inclusive** at both
 * ends). Paired with the strict overdue rule, every dated non-done task is exactly one of overdue, due soon, or
 * later than the window.
 */
export function isDueSoon(t: DeadlineFacts, now: Date): boolean {
  if (t.status === "done" || t.deadline === null) return false;
  const deadline = t.deadline.getTime();
  const start = now.getTime();
  return start <= deadline && deadline <= start + DUE_SOON_WINDOW_MS;
}
