import "server-only";
import type { Task } from "@/contracts";
import { taskIdSchema } from "@/contracts/schemas/common";
import { describeDeadline, type DeadlineDescription } from "@/domain";
import type { Repositories } from "@/server/repositories";

export interface TaskCardData {
  task: Task;
  listName: string;
  deadlineInfo: DeadlineDescription;
}

/**
 * The task card for `userId`, or `null` when the id is malformed, missing, or another user's task — the three
 * are indistinguishable, so a guessed id reveals nothing.
 */
export async function getTaskCard(
  repos: Pick<Repositories, "tasks">,
  userId: string,
  taskId: string,
  { now }: { now: Date },
): Promise<TaskCardData | null> {
  const id = taskIdSchema.safeParse(taskId);
  if (!id.success) return null;
  const row = await repos.tasks.get(userId, id.data);
  if (row === null) return null;
  const { listName, ...task } = row;
  return { task, listName, deadlineInfo: describeDeadline(task.deadline, task.status, now) };
}
