import "server-only";
import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES, type Task, type TaskFacts, type TaskList } from "@/contracts/task";

const instant = z
  .number()
  .int()
  .transform((ms) => new Date(ms));
const nullableInstant = instant.nullable();

const listRowSchema = z
  .object({ id: z.string(), name: z.string(), createdAt: instant, updatedAt: instant })
  .transform((row): TaskList => row);

const taskFactsRowSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    deadline: nullableInstant,
  })
  .transform((row): TaskFacts => row);

const taskRowSchema = z
  .object({
    id: z.string(),
    listId: z.string(),
    title: z.string(),
    description: z.string(),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    deadline: nullableInstant,
    createdAt: instant,
    updatedAt: instant,
  })
  .transform((row): Task => row);

export const toTaskList = (row: unknown): TaskList => listRowSchema.parse(row);
export const toTaskFacts = (row: unknown): TaskFacts => taskFactsRowSchema.parse(row);
export const toTask = (row: unknown): Task => taskRowSchema.parse(row);

export const toDeadlineMs = (deadline: Date | null): number | null => (deadline === null ? null : deadline.getTime());
