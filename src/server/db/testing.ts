import "server-only";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openDb, type Db, type OpenedDb } from "./client";
import { runMigrations } from "./migrate";
import { users } from "./schema";

export interface TestDb extends OpenedDb {
  path: string;
  cleanup: () => Promise<void>;
}

/**
 * Best-effort temp-dir removal. On Windows the native binding releases the file handle seconds
 * after close() (measured up to ~9s), so awaiting rm fails with EBUSY or stalls the test hook.
 * Retries run in the background; the dir is removed once the lock clears.
 */
export function removeDirWhenUnlocked(dir: string): Promise<void> {
  return (async () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await rm(dir, { recursive: true, force: true });
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  })();
}

/**
 * A fresh, migrated libSQL database in its own temp directory. Never `:memory:`: an in-memory libSQL
 * database exists on one connection only, so anything that opens a second connection sees an empty DB.
 */
export async function createTestDb(): Promise<TestDb> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "task-manager-db-"));
  const file = path.join(dir, "test.db");
  const opened = await openDb({ databaseUrl: `file:${file}`, databaseAuthToken: undefined });
  await runMigrations(opened.db);
  return {
    ...opened,
    path: file,
    cleanup: async () => {
      opened.client.close();
      void removeDirWhenUnlocked(dir);
    },
  };
}

/** Inserts a user directly (tests need owners without going through the seed) and returns its id. */
export async function insertTestUser(db: Db, email: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, email, passwordHash: "not-a-real-hash", createdAt: 0 });
  return id;
}
