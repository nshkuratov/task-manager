import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "task-manager-repos-"));
  vi.resetModules();
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("getRepositories", () => {
  it("opens the configured database once, creating its directory, and reads through it", async () => {
    vi.stubEnv("DATABASE_URL", `file:${path.join(dir, "nested", "app.db")}`);
    const { getRepositories } = await import("@/server/repositories");
    const { getDb } = await import("@/server/db/client");
    const { runMigrations } = await import("@/server/db/migrate");
    await runMigrations(await getDb());

    const first = await getRepositories();
    expect(await getRepositories()).toBe(first);
    expect(await first.lists.listWithTaskFacts(crypto.randomUUID())).toEqual([]);
  });

  it("does not cache a failed open, so the next call retries", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://wrong");
    const { getRepositories } = await import("@/server/repositories");
    await expect(getRepositories()).rejects.toThrow(/DATABASE_URL must start with/);

    vi.stubEnv("DATABASE_URL", `file:${path.join(dir, "app.db")}`);
    await expect(getRepositories()).resolves.toBeDefined();
  });
});
