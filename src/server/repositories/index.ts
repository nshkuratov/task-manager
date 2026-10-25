import "server-only";
import { getDb, type Db } from "@/server/db/client";
import { createListsRepository } from "./lists";
import { createTasksRepository } from "./tasks";
import { createUsersRepository } from "./users";

export interface RepositoryOptions {
  /** The clock every repository write stamps `createdAt` / `updatedAt` from. */
  now?: () => Date;
}

export function createRepositories(db: Db, { now = () => new Date() }: RepositoryOptions = {}) {
  return {
    users: createUsersRepository(db),
    lists: createListsRepository(db, now),
    tasks: createTasksRepository(db, now),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
export { DuplicateNameError, nameKey } from "./duplicate-name";
export type { ListWithTaskFacts } from "./lists";
export type { UserCredentials, UserIdentity } from "./users";

let pending: Promise<Repositories> | undefined;

/** The app's repositories over the shared database: the only data entry point for pages, actions and queries. */
export function getRepositories(): Promise<Repositories> {
  pending ??= getDb().then(
    (db) => createRepositories(db),
    (error: unknown) => {
      pending = undefined;
      throw error;
    },
  );
  return pending;
}
