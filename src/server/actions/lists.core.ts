import "server-only";
import {
  createListSchema,
  deleteListSchema,
  renameListSchema,
  type ActionResult,
  type CreateListOutput,
  type DeleteListOutput,
  type RenameListOutput,
  type TaskList,
} from "@/contracts";
import type { Repositories } from "@/server/repositories";
import { LIST_GONE } from "./tasks.core";
import { writeUnlessNameTaken } from "./unique-name";

/** What every list handler needs; `defineAction` supplies a superset. */
export interface ListHandlerContext<I> {
  input: I;
  userId: string;
  repos: Pick<Repositories, "lists">;
}

/** The cached pages showing a list; `/tasks/<id>` pages read the session cookie, so they are never cached. */
export const listPaths = (listId: string): string[] => ["/lists", `/lists/${listId}`];

export const LIST_NAME_TAKEN = "A list with this name already exists.";
const NAME_TAKEN = { field: "name", message: LIST_NAME_TAKEN };

export async function createListCore({
  input,
  userId,
  repos,
}: ListHandlerContext<CreateListOutput>): Promise<ActionResult<TaskList>> {
  return writeUnlessNameTaken(
    NAME_TAKEN,
    () => repos.lists.isNameTaken(userId, input.name),
    async () => ({ ok: true, data: await repos.lists.create(userId, input.name) }),
  );
}

// A missing list and another user's list get the same answer, so ids reveal nothing about other accounts.
export async function renameListCore({
  input,
  userId,
  repos,
}: ListHandlerContext<RenameListOutput>): Promise<ActionResult<TaskList>> {
  return writeUnlessNameTaken(
    NAME_TAKEN,
    () => repos.lists.isNameTaken(userId, input.name, input.id),
    async () => {
      const list = await repos.lists.rename(userId, input.id, input.name);
      return list === null ? { ok: false, formError: LIST_GONE } : { ok: true, data: list };
    },
  );
}

export async function deleteListCore({
  input,
  userId,
  repos,
}: ListHandlerContext<DeleteListOutput>): Promise<ActionResult<{ deletedTasks: number }>> {
  const deleted = await repos.lists.delete(userId, input.id);
  return deleted === null ? { ok: false, formError: LIST_GONE } : { ok: true, data: deleted };
}

/**
 * Schema, handler and revalidation per action. `lists.ts` wires the Server Actions from this table and the
 * tests build theirs from it too, so the tested pairing is the shipped one.
 */
export const listActionSpecs = {
  createList: { schema: createListSchema, handler: createListCore, revalidate: () => ["/lists"] },
  renameList: {
    schema: renameListSchema,
    handler: renameListCore,
    revalidate: (input: RenameListOutput) => listPaths(input.id),
  },
  deleteList: {
    schema: deleteListSchema,
    handler: deleteListCore,
    revalidate: (input: DeleteListOutput) => listPaths(input.id),
  },
};
