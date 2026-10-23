// No `import "server-only"`: drizzle-kit loads this file under default Node conditions, where it throws.
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/contracts/task";

const inList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

/** Every timestamp is integer milliseconds since the epoch (UTC), written by the repository from an injected `now`. */
const ms = (name: string) => integer(name, { mode: "number" });

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: ms("created_at").notNull(),
});

export const lists = sqliteTable(
  "lists",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: ms("created_at").notNull(),
    updatedAt: ms("updated_at").notNull(),
  },
  (table) => [index("lists_user_id_created_at_idx").on(table.userId, table.createdAt)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    listId: text("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: TASK_STATUSES }).notNull(),
    priority: text("priority", { enum: TASK_PRIORITIES }).notNull(),
    deadline: ms("deadline"),
    createdAt: ms("created_at").notNull(),
    updatedAt: ms("updated_at").notNull(),
  },
  (table) => [
    index("tasks_list_id_idx").on(table.listId),
    check("tasks_status_check", sql`${table.status} in (${inList(TASK_STATUSES)})`),
    check("tasks_priority_check", sql`${table.priority} in (${inList(TASK_PRIORITIES)})`),
  ],
);
