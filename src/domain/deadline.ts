import type { TaskStatus } from "@/contracts/task";
import { isDueSoon, isOverdue } from "./overdue";

export interface DeadlineDescription {
  kind: "none" | "overdue" | "due-soon" | "upcoming" | "done";
  /** `deadline − now` in milliseconds (negative when past); `null` when undated. */
  deltaMs: number | null;
}

/**
 * Precedence: `done` (any deadline, including none) → `none` (undated) → `overdue` (`deadline < now`, strict) →
 * `due-soon` (`now <= deadline <= now + 48h`, inclusive) → `upcoming`.
 */
export function describeDeadline(deadline: Date | null, status: TaskStatus, now: Date): DeadlineDescription {
  const deltaMs = deadline === null ? null : deadline.getTime() - now.getTime();
  if (status === "done") return { kind: "done", deltaMs };
  if (deadline === null) return { kind: "none", deltaMs };
  if (isOverdue({ status, deadline }, now)) return { kind: "overdue", deltaMs };
  if (isDueSoon({ status, deadline }, now)) return { kind: "due-soon", deltaMs };
  return { kind: "upcoming", deltaMs };
}
