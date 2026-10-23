import type { ActionResult, CreateListInput, DeleteListInput, RenameListInput, TaskList } from "@/contracts";

/** The `createList` Server Action, or a story's fake. */
export type CreateListAction = (input: CreateListInput) => Promise<ActionResult<TaskList>>;
export type RenameListAction = (input: RenameListInput) => Promise<ActionResult<TaskList>>;
export type DeleteListAction = (input: DeleteListInput) => Promise<ActionResult<{ deletedTasks: number }>>;
