import type { ListIndicator, TaskFacts } from "@/contracts/task";
import { isDueSoon, isOverdue } from "./overdue";

/**
 * `"overdue"` (red) if any task is overdue (strict `deadline < now`); otherwise `"due-soon"` (yellow) if any task
 * has `now <= deadline <= now + 48h`; otherwise `"none"`. Red wins over yellow; `done` tasks never count.
 */
export function indicatorOf(tasks: readonly TaskFacts[], now: Date): ListIndicator {
  if (tasks.some((t) => isOverdue(t, now))) return "overdue";
  if (tasks.some((t) => isDueSoon(t, now))) return "due-soon";
  return "none";
}
