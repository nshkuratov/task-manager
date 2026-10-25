import "server-only";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { inject } from "vitest";
import { openDb, type Db, type OpenedDb } from "./client";
import { runMigrations } from "./migrate";
import { users } from "./schema";

export interface TestDb extends OpenedDb {
  path: string;
  cleanup: () => Promise<void>;
}

/** A fresh directory under the run's temp root (`src/test/temp-root.ts`), which is deleted when the run ends. */
export async function makeTestDbDir(prefix: string): Promise<string> {
  return mkdtemp(path.join(inject("testTmpRoot"), prefix));
}

/**
 * Deletes a temp database directory whose clients are already closed. On Windows libSQL keeps the file
 * open after `close()` until its native statement handles are garbage-collected, so the delete fails with
 * EBUSY. Collecting usually releases them (the unit project runs with `--expose-gc`), but an error a failed
 * statement threw pins its handle for as long as the error is reachable, and vitest keeps rejected errors
 * past `afterEach`. Such a directory is left for the run's teardown, which deletes it once the worker exits.
 */
export async function removeTestDbDir(dir: string): Promise<void> {
  if (process.platform === "win32") globalThis.gc?.();
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (error) {
    const busy = error instanceof Error && "code" in error && error.code === "EBUSY";
    if (process.platform !== "win32" || !busy) throw error;
  }
}

/**
 * A fresh, migrated libSQL database in its own temp directory. Never `:memory:`: an in-memory libSQL
 * database exists on one connection only, so anything that opens a second connection sees an empty DB.
 */
export async function createTestDb(): Promise<TestDb> {
  const dir = await makeTestDbDir("task-manager-db-");
  const file = path.join(dir, "test.db");
  const opened = await openDb({ databaseUrl: `file:${file}`, databaseAuthToken: undefined });
  await runMigrations(opened.db);
  return {
    ...opened,
    path: file,
    cleanup: async () => {
      opened.client.close();
      await removeTestDbDir(dir);
    },
  };
}

/** Inserts a user directly (tests need owners without going through the seed) and returns its id. */
export async function insertTestUser(db: Db, email: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, email, passwordHash: "not-a-real-hash", createdAt: 0 });
  return id;
}
