import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskFieldsOutput } from "@/contracts/schemas/tasks";
import { lists, tasks } from "@/server/db/schema";
import { createTestDb, insertTestUser, type TestDb } from "@/server/db/testing";
import { createRepositories, type Repositories } from "@/server/repositories";

const START = new Date("2026-10-22T12:00:00Z");
let clock: Date;
let testDb: TestDb;
let repos: Repositories;
let alice: string;
let bob: string;

const tick = (ms = 1000) => {
  clock = new Date(clock.getTime() + ms);
};
const fields = (overrides: Partial<TaskFieldsOutput> = {}): TaskFieldsOutput => ({
  title: "Task",
  description: "",
  status: "new",
  priority: "medium",
  deadline: null,
  ...overrides,
});
const taskCount = async () => (await testDb.db.select({ n: sql<number>`count(*)` }).from(tasks))[0]?.n;

beforeEach(async () => {
  clock = START;
  testDb = await createTestDb();
  repos = createRepositories(testDb.db, { now: () => clock });
  alice = await insertTestUser(testDb.db, "alice@example.com");
  bob = await insertTestUser(testDb.db, "bob@example.com");
});
afterEach(async () => {
  await testDb.cleanup();
});

describe("lists repository", () => {
  it("R-LIST-5, R-DATA-1: creates a list stamped with the injected clock and reads it back", async () => {
    const created = await repos.lists.create(alice, "Groceries");
    expect(created).toEqual({ id: expect.any(String), name: "Groceries", createdAt: START, updatedAt: START });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await repos.lists.get(alice, created.id)).toEqual(created);
  });

  it("R-LIST-6: renames a list, advancing updatedAt only", async () => {
    const created = await repos.lists.create(alice, "Groceries");
    tick();
    const renamed = await repos.lists.rename(alice, created.id, "Weekly shop");
    expect(renamed).toEqual({ ...created, name: "Weekly shop", updatedAt: clock });
  });

  it("returns null for another user's list and leaves it untouched", async () => {
    const created = await repos.lists.create(alice, "Private");
    await repos.tasks.create(alice, created.id, fields());

    expect(await repos.lists.get(bob, created.id)).toBeNull();
    expect(await repos.lists.rename(bob, created.id, "Hijacked")).toBeNull();
    expect(await repos.lists.delete(bob, created.id)).toBeNull();

    expect(await repos.lists.get(alice, created.id)).toEqual(created);
    expect(await taskCount()).toBe(1);
  });

  it("returns null for a list that does not exist", async () => {
    const missing = crypto.randomUUID();
    expect(await repos.lists.get(alice, missing)).toBeNull();
    expect(await repos.lists.rename(alice, missing, "x")).toBeNull();
    expect(await repos.lists.delete(alice, missing)).toBeNull();
  });

  it("R-LIST-7: deletes a list with its tasks and reports how many tasks went", async () => {
    const doomed = await repos.lists.create(alice, "Doomed");
    const kept = await repos.lists.create(alice, "Kept");
    await repos.tasks.create(alice, doomed.id, fields({ title: "a" }));
    await repos.tasks.create(alice, doomed.id, fields({ title: "b" }));
    await repos.tasks.create(alice, kept.id, fields({ title: "c" }));

    expect(await repos.lists.delete(alice, doomed.id)).toEqual({ deletedTasks: 2 });
    expect(await repos.lists.get(alice, doomed.id)).toBeNull();
    expect(await testDb.db.select({ title: tasks.title }).from(tasks)).toEqual([{ title: "c" }]);
  });

  it("deletes an empty list, reporting zero tasks", async () => {
    const empty = await repos.lists.create(alice, "Empty");
    expect(await repos.lists.delete(alice, empty.id)).toEqual({ deletedTasks: 0 });
  });

  it("R-DATA-1: lists the user's lists newest first with each list's task facts, including empty lists", async () => {
    const older = await repos.lists.create(alice, "Older");
    tick();
    const newer = await repos.lists.create(alice, "Newer");
    await repos.lists.create(bob, "Bob's");
    const deadline = new Date("2026-10-23T09:30:00.123Z");
    const first = await repos.tasks.create(alice, older.id, fields({ title: "First", deadline }));
    tick();
    const second = await repos.tasks.create(
      alice,
      older.id,
      fields({ title: "Second", status: "done", priority: "high" }),
    );

    const result = await repos.lists.listWithTaskFacts(alice);
    expect(result).toEqual([
      { list: newer, tasks: [] },
      {
        list: older,
        tasks: [
          { id: first?.id, title: "First", status: "new", priority: "medium", deadline },
          { id: second?.id, title: "Second", status: "done", priority: "high", deadline: null },
        ],
      },
    ]);
  });

  it("returns an empty array for a user with no lists", async () => {
    expect(await repos.lists.listWithTaskFacts(bob)).toEqual([]);
  });

  it("reads every list's facts in one query", async () => {
    for (const name of ["a", "b", "c"]) {
      const list = await repos.lists.create(alice, name);
      await repos.tasks.create(alice, list.id, fields());
    }
    const execute = vi.spyOn(testDb.client, "execute");
    const batch = vi.spyOn(testDb.client, "batch");
    const executeMultiple = vi.spyOn(testDb.client, "executeMultiple");

    expect(await repos.lists.listWithTaskFacts(alice)).toHaveLength(3);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(batch).not.toHaveBeenCalled();
    expect(executeMultiple).not.toHaveBeenCalled();
  });

  it("rejects instead of swallowing when the database is gone", async () => {
    testDb.client.close();
    await expect(repos.lists.listWithTaskFacts(alice)).rejects.toThrow();
    await expect(repos.lists.create(alice, "x")).rejects.toThrow();
  });

  it("stores timestamps as integer milliseconds", async () => {
    const created = await repos.lists.create(alice, "Raw");
    const [row] = await testDb.db.select({ createdAt: lists.createdAt }).from(lists).where(eq(lists.id, created.id));
    expect(row?.createdAt).toBe(START.getTime());
  });
});
