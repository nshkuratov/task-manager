import "server-only";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import type { TaskFacts, TaskList } from "@/contracts/task";
import type { Db } from "@/server/db/client";
import { LIST_NAME_INDEX, lists, tasks } from "@/server/db/schema";
import { guardUniqueName, nameKey } from "./duplicate-name";
import { toTaskFacts, toTaskList } from "./mappers";

export interface ListWithTaskFacts {
  list: TaskList;
  tasks: TaskFacts[];
}

const listColumns = { id: lists.id, name: lists.name, createdAt: lists.createdAt, updatedAt: lists.updatedAt };

export function createListsRepository(db: Db, now: () => Date) {
  const owned = (userId: string, listId: string) => and(eq(lists.id, listId), eq(lists.userId, userId));

  return {
    /** Every list of the user, newest first, each with the facts the domain rules need. One query. */
    async listWithTaskFacts(userId: string): Promise<ListWithTaskFacts[]> {
      const rows = await db
        .select({
          list: listColumns,
          task: {
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            priority: tasks.priority,
            deadline: tasks.deadline,
          },
        })
        .from(lists)
        .leftJoin(tasks, eq(tasks.listId, lists.id))
        .where(eq(lists.userId, userId))
        .orderBy(desc(lists.createdAt), asc(lists.id), asc(tasks.createdAt), asc(tasks.id));

      const byId = new Map<string, ListWithTaskFacts>();
      for (const row of rows) {
        let entry = byId.get(row.list.id);
        if (entry === undefined) {
          entry = { list: toTaskList(row.list), tasks: [] };
          byId.set(row.list.id, entry);
        }
        // A list without tasks still yields one joined row, with every task column null.
        if (row.task !== null) entry.tasks.push(toTaskFacts(row.task));
      }
      return [...byId.values()];
    },

    async get(userId: string, listId: string): Promise<TaskList | null> {
      const [row] = await db.select(listColumns).from(lists).where(owned(userId, listId));
      return row === undefined ? null : toTaskList(row);
    },

    async create(userId: string, name: string): Promise<TaskList> {
      const at = now().getTime();
      const [row] = await guardUniqueName(LIST_NAME_INDEX, () =>
        db
          .insert(lists)
          .values({ id: crypto.randomUUID(), userId, name, createdAt: at, updatedAt: at })
          .returning(listColumns),
      );
      return toTaskList(row);
    },

    /** Whether another of the user's lists has this name, case-insensitively: the duplicate-name check. */
    async isNameTaken(userId: string, name: string, excludeId?: string): Promise<boolean> {
      const rows = await db
        .select({ name: lists.name })
        .from(lists)
        .where(and(eq(lists.userId, userId), excludeId === undefined ? undefined : ne(lists.id, excludeId)));
      const key = nameKey(name);
      return rows.some((row) => nameKey(row.name) === key);
    },

    async rename(userId: string, listId: string, name: string): Promise<TaskList | null> {
      const [row] = await guardUniqueName(LIST_NAME_INDEX, () =>
        db.update(lists).set({ name, updatedAt: now().getTime() }).where(owned(userId, listId)).returning(listColumns),
      );
      return row === undefined ? null : toTaskList(row);
    },

    /**
     * Deletes the list and its tasks in one batch. The tasks are deleted explicitly rather than left to
     * `ON DELETE CASCADE`, so the result does not depend on the server enforcing foreign keys.
     */
    async delete(userId: string, listId: string): Promise<{ deletedTasks: number } | null> {
      const ownedListIds = db.select({ id: lists.id }).from(lists).where(owned(userId, listId));
      const [deletedTasks, deletedLists] = await db.batch([
        db.delete(tasks).where(inArray(tasks.listId, ownedListIds)),
        db.delete(lists).where(owned(userId, listId)),
      ]);
      return deletedLists.rowsAffected === 0 ? null : { deletedTasks: deletedTasks.rowsAffected };
    },
  };
}
