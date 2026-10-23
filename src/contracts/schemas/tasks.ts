import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "../task";
import { INVALID_SUBMISSION, listIdSchema, taskIdSchema, trimmedText } from "./common";

const statusSchema = z.enum(TASK_STATUSES, { error: "Choose a valid status" });
const prioritySchema = z.enum(TASK_PRIORITIES, { error: "Choose a valid priority" });

/** `""` means "no deadline": FormData cannot carry `null`. */
const deadlineSchema = z.union(
  [
    z.null(),
    z.literal("").transform(() => null),
    z.iso.datetime({ offset: true }).transform((instant) => new Date(instant)),
  ],
  { error: "Enter a valid deadline" },
);

export const taskFieldsSchema = z.object(
  {
    title: trimmedText("Title", 120),
    description: z
      .string({ error: "Description must be text" })
      .trim()
      .max(2000, { error: "Description must be 2000 characters or fewer" })
      .default(""),
    status: statusSchema.default("new"),
    priority: prioritySchema.default("medium"),
    deadline: deadlineSchema,
  },
  { error: INVALID_SUBMISSION },
);

export const createTaskSchema = taskFieldsSchema.extend({ listId: listIdSchema });
export const updateTaskSchema = taskFieldsSchema.extend({ id: taskIdSchema });
// Its own status node, without the create-form default: a status change that omits the status must fail,
// not reset the task to "new".
export const changeTaskStatusSchema = z.object(
  { id: taskIdSchema, status: statusSchema },
  { error: INVALID_SUBMISSION },
);
export const deleteTaskSchema = z.object({ id: taskIdSchema }, { error: INVALID_SUBMISSION });

export type TaskFieldsInput = z.input<typeof taskFieldsSchema>;
export type TaskFieldsOutput = z.output<typeof taskFieldsSchema>;
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type CreateTaskOutput = z.output<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type UpdateTaskOutput = z.output<typeof updateTaskSchema>;
export type ChangeTaskStatusInput = z.input<typeof changeTaskStatusSchema>;
export type ChangeTaskStatusOutput = z.output<typeof changeTaskStatusSchema>;
export type DeleteTaskInput = z.input<typeof deleteTaskSchema>;
export type DeleteTaskOutput = z.output<typeof deleteTaskSchema>;
