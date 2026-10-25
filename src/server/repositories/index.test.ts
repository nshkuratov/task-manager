import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/server/db/client";
import { makeTestDbDir, removeTestDbDir } from "@/server/db/testing";

let dir: string;
// The module-cached database a test opened on a file in `dir`; Windows cannot delete the file until it is closed.
let opened: Db | undefined;

beforeEach(async () => {
  dir = await makeTestDbDir("task-manager-repos-");
  vi.resetModules();
});
afterEach(async () => {
  opened?.$client.close();
  opened = undefined;
  vi.unstubAllEnvs();
  await removeTestDbDir(dir);
});

describe("getRepositories", () => {
  it("opens the configured database once, creating its directory, and reads through it", async () => {
    vi.stubEnv("DATABASE_URL", `file:${path.join(dir, "nested", "app.db")}`);
    const { getRepositories } = await import("@/server/repositories");
    const { getDb } = await import("@/server/db/client");
    const { runMigrations } = await import("@/server/db/migrate");
    opened = await getDb();
    await runMigrations(opened);

    const first = await getRepositories();
    expect(await getRepositories()).toBe(first);
    expect(await first.lists.listWithTaskFacts(crypto.randomUUID())).toEqual([]);
  });

  it("does not cache a failed open, so the next call retries", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://wrong");
    const { getRepositories } = await import("@/server/repositories");
    const { getDb } = await import("@/server/db/client");
    await expect(getRepositories()).rejects.toThrow(/DATABASE_URL must start with/);

    vi.stubEnv("DATABASE_URL", `file:${path.join(dir, "app.db")}`);
    await expect(getRepositories()).resolves.toBeDefined();
    opened = await getDb();
  });
});
