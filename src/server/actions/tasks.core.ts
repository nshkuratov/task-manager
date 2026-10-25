import "server-only";
import {
  changeTaskStatusSchema,
  createTaskSchema,
  deleteTaskSchema,
  updateTaskSchema,
  type ActionResult,
  type ChangeTaskStatusOutput,
  type CreateTaskOutput,
  type DeleteTaskOutput,
  type Task,
  type UpdateTaskOutput,
} from "@/contracts";
import { nameKey, type Repositories } from "@/server/repositories";
import { writeUnlessNameTaken } from "./unique-name";

export const TASK_GONE = "This task no longer exists.";
export const LIST_GONE = "This list no longer exists.";
export const TASK_TITLE_TAKEN = "A task with this title already exists in this list.";
const TITLE_TAKEN = { field: "title", message: TASK_TITLE_TAKEN };

/** What every task handler needs; `defineAction` supplies a superset. */
export interface TaskHandlerContext<I> {
  input: I;
  userId: string;
  repos: Pick<Repositories, "tasks">;
}

/** Every page that shows the task: the lists overview (counters), its list, and its card. */
export const taskPaths = (taskId: string, listId: string): string[] => [
  "/lists",
  `/lists/${listId}`,
  `/tasks/${taskId}`,
];

// A missing task and another user's task get the same answer, so ids reveal nothing about other accounts.
const taskResult = (task: Task | null): ActionResult<Task> =>
  task === null ? { ok: false, formError: TASK_GONE } : { ok: true, data: task };

export async function createTaskCore({
  input: { listId, ...fields },
  userId,
  repos,
}: TaskHandlerContext<CreateTaskOutput>): Promise<ActionResult<Task>> {
  return writeUnlessNameTaken(
    TITLE_TAKEN,
    () => repos.tasks.isTitleTaken(userId, listId, fields.title),
    async () => {
      const task = await repos.tasks.create(userId, listId, fields);
      return task === null ? { ok: false, formError: LIST_GONE } : { ok: true, data: task };
    },
  );
}

export async function updateTaskCore({
  input: { id, ...fields },
  userId,
  repos,
}: TaskHandlerContext<UpdateTaskOutput>): Promise<ActionResult<Task>> {
  const task = await repos.tasks.get(userId, id);
  if (task === null) return { ok: false, formError: TASK_GONE };
  // An unchanged title is not re-checked, so a task that already collides (older data) can still be edited.
  const titleChanged = nameKey(fields.title) !== nameKey(task.title);
  return writeUnlessNameTaken(
    TITLE_TAKEN,
    () => (titleChanged ? repos.tasks.isTitleTaken(userId, task.listId, fields.title, id) : Promise.resolve(false)),
    async () => taskResult(await repos.tasks.update(userId, id, fields)),
  );
}

export async function setTaskStatusCore({
  input,
  userId,
  repos,
}: TaskHandlerContext<ChangeTaskStatusOutput>): Promise<ActionResult<Task>> {
  return taskResult(await repos.tasks.setStatus(userId, input.id, input.status));
}

export async function deleteTaskCore({
  input,
  userId,
  repos,
}: TaskHandlerContext<DeleteTaskOutput>): Promise<ActionResult<{ listId: string }>> {
  const deleted = await repos.tasks.delete(userId, input.id);
  return deleted === null ? { ok: false, formError: TASK_GONE } : { ok: true, data: deleted };
}

const revalidateTask = (_input: unknown, task: Task) => taskPaths(task.id, task.listId);

/**
 * Schema, handler and revalidation per action. `tasks.ts` wires the Server Actions from this table and the
 * tests build theirs from it too, so the tested pairing is the shipped one.
 */
export const taskActionSpecs = {
  createTask: { schema: createTaskSchema, handler: createTaskCore, revalidate: revalidateTask },
  updateTask: { schema: updateTaskSchema, handler: updateTaskCore, revalidate: revalidateTask },
  setTaskStatus: { schema: changeTaskStatusSchema, handler: setTaskStatusCore, revalidate: revalidateTask },
  deleteTask: {
    schema: deleteTaskSchema,
    handler: deleteTaskCore,
    revalidate: (input: DeleteTaskOutput, { listId }: { listId: string }) => taskPaths(input.id, listId),
  },
};
