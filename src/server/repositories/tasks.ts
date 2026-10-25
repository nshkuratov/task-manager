import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import type { Task, TaskStatus } from "@/contracts/task";
import type { TaskFieldsOutput } from "@/contracts/schemas/tasks";
import type { Db } from "@/server/db/client";
import { lists, TASK_TITLE_INDEX, tasks } from "@/server/db/schema";
import { guardUniqueName, nameKey } from "./duplicate-name";
import { toDeadlineMs, toTask } from "./mappers";

const taskColumns = {
  id: tasks.id,
  listId: tasks.listId,
  title: tasks.title,
  description: tasks.description,
  status: tasks.status,
  priority: tasks.priority,
  deadline: tasks.deadline,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
};

const writableFields = (fields: TaskFieldsOutput) => ({
  title: fields.title,
  description: fields.description,
  status: fields.status,
  priority: fields.priority,
  deadline: toDeadlineMs(fields.deadline),
});

export function createTasksRepository(db: Db, now: () => Date) {
  const listIdsOf = (userId: string) => db.select({ id: lists.id }).from(lists).where(eq(lists.userId, userId));
  const ownedTask = (userId: string, taskId: string) =>
    and(eq(tasks.id, taskId), inArray(tasks.listId, listIdsOf(userId)));
  const ownsList = async (userId: string, listId: string) => {
    const [row] = await db
      .select({ id: lists.id })
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
    return row !== undefined;
  };

  return {
    /** The list's tasks in insertion order (presentation order is the domain's `sortTasks`); null when not owned. */
    async listForList(userId: string, listId: string): Promise<Task[] | null> {
      if (!(await ownsList(userId, listId))) return null;
      const rows = await db
        .select(taskColumns)
        .from(tasks)
        .where(eq(tasks.listId, listId))
        .orderBy(asc(tasks.createdAt), asc(tasks.id));
      return rows.map(toTask);
    },

    async get(userId: string, taskId: string): Promise<(Task & { listName: string }) | null> {
      const [row] = await db
        .select({ task: taskColumns, listName: lists.name })
        .from(tasks)
        .innerJoin(lists, eq(lists.id, tasks.listId))
        .where(and(eq(tasks.id, taskId), eq(lists.userId, userId)));
      return row === undefined ? null : { ...toTask(row.task), listName: row.listName };
    },

    /** Whether another task in the user's list has this title, case-insensitively: the duplicate-title check. */
    async isTitleTaken(userId: string, listId: string, title: string, excludeId?: string): Promise<boolean> {
      const rows = await db
        .select({ title: tasks.title })
        .from(tasks)
        .where(
          and(
            eq(tasks.listId, listId),
            inArray(tasks.listId, listIdsOf(userId)),
            excludeId === undefined ? undefined : ne(tasks.id, excludeId),
          ),
        );
      const key = nameKey(title);
      return rows.some((row) => nameKey(row.title) === key);
    },

    async create(userId: string, listId: string, fields: TaskFieldsOutput): Promise<Task | null> {
      if (!(await ownsList(userId, listId))) return null;
      const at = now().getTime();
      const [row] = await guardUniqueName(TASK_TITLE_INDEX, () =>
        db
          .insert(tasks)
          .values({ id: crypto.randomUUID(), listId, ...writableFields(fields), createdAt: at, updatedAt: at })
          .returning(taskColumns),
      );
      return toTask(row);
    },

    async update(userId: string, taskId: string, fields: TaskFieldsOutput): Promise<Task | null> {
      const [row] = await guardUniqueName(TASK_TITLE_INDEX, () =>
        db
          .update(tasks)
          .set({ ...writableFields(fields), updatedAt: now().getTime() })
          .where(ownedTask(userId, taskId))
          .returning(taskColumns),
      );
      return row === undefined ? null : toTask(row);
    },

    async setStatus(userId: string, taskId: string, status: TaskStatus): Promise<Task | null> {
      const [row] = await db
        .update(tasks)
        .set({ status, updatedAt: now().getTime() })
        .where(ownedTask(userId, taskId))
        .returning(taskColumns);
      return row === undefined ? null : toTask(row);
    },

    async delete(userId: string, taskId: string): Promise<{ listId: string } | null> {
      const [row] = await db.delete(tasks).where(ownedTask(userId, taskId)).returning({ listId: tasks.listId });
      return row ?? null;
    },
  };
}
