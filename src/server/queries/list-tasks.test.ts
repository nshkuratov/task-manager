import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TaskFieldsOutput } from "@/contracts/schemas/tasks";
import type { TaskList } from "@/contracts/task";
import { createTestDb, insertTestUser, type TestDb } from "@/server/db/testing";
import { createRepositories, type Repositories } from "@/server/repositories";
import { getListWithTasks } from "./list-tasks";

const NOW = new Date("2026-10-22T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR);

let testDb: TestDb;
let repos: Repositories;
let alice: string;
let bob: string;
let list: TaskList;
let createdAt: number;

async function addTask(fields: Partial<TaskFieldsOutput> & { title: string }) {
  const task = await repos.tasks.create(alice, list.id, {
    description: "",
    status: "new",
    priority: "medium",
    deadline: null,
    ...fields,
  });
  if (task === null) throw new Error("test setup: task was not created");
  return task;
}

beforeEach(async () => {
  createdAt = 0;
  testDb = await createTestDb();
  // A distinct creation instant per write, so insertion order (the repository's order) is the order of the calls.
  repos = createRepositories(testDb.db, { now: () => new Date((createdAt += 1)) });
  alice = await insertTestUser(testDb.db, "alice@example.com");
  bob = await insertTestUser(testDb.db, "bob@example.com");
  list = await repos.lists.create(alice, "Product launch");
});
afterEach(async () => {
  await testDb.cleanup();
});

/** Inserted deliberately out of order; the expected urgency order is spelled out in the first test. */
async function seedMixedList() {
  await addTask({ title: "Done, undated", status: "done" });
  await addTask({ title: "Later", deadline: at(24 * 10) });
  await addTask({ title: "Soon, low", priority: "low", deadline: at(5) });
  await addTask({ title: "Undated, high", priority: "high" });
  await addTask({ title: "Done long ago", status: "done", deadline: at(-24 * 30) });
  await addTask({ title: "Overdue by an hour", status: "in_progress", deadline: at(-1) });
  await addTask({ title: "Soon, high", priority: "high", deadline: at(5) });
  await addTask({ title: "Overdue by three days", priority: "low", deadline: at(-72) });
  await addTask({ title: "Done tomorrow", status: "done", priority: "high", deadline: at(24) });
}

const titles = (result: Awaited<ReturnType<typeof getListWithTasks>>) => result?.tasks.map((task) => task.title);

describe("getListWithTasks", () => {
  it("R-SORT-1, R-SORT-2, R-SORT-3, R-SORT-4, R-TASKS-1: returns the list's tasks from the DB in urgency order", async () => {
    await seedMixedList();
    const result = await getListWithTasks(repos, alice, list.id, { now: NOW });

    expect(titles(result)).toEqual([
      "Overdue by three days",
      "Overdue by an hour",
      "Soon, high",
      "Soon, low",
      "Later",
      "Undated, high",
      "Done long ago",
      "Done tomorrow",
      "Done, undated",
    ]);
    expect(result?.list).toEqual(list);
  });

  it("R-TASKS-6: filters by status, keeps the urgency order, and leaves the counts unfiltered", async () => {
    await seedMixedList();
    const all = await getListWithTasks(repos, alice, list.id, { statuses: [], now: NOW });
    const done = await getListWithTasks(repos, alice, list.id, { statuses: ["done"], now: NOW });
    const open = await getListWithTasks(repos, alice, list.id, { statuses: ["new", "in_progress"], now: NOW });

    expect(titles(done)).toEqual(["Done long ago", "Done tomorrow", "Done, undated"]);
    expect(titles(open)).toEqual(titles(all)?.filter((title) => !title.startsWith("Done")));

    const expectedCounts = { new: 5, in_progress: 1, done: 3 };
    for (const result of [all, done, open]) {
      expect(result?.countsByStatus).toEqual(expectedCounts);
      expect(result?.totalUnfiltered).toBe(9);
      expect(result?.summary.counters).toEqual({ new: 5, inProgress: 1, done: 3, overdue: 2, total: 9 });
      expect(result?.summary.indicator).toBe("overdue");
      expect(result?.summary.progress).toBeCloseTo(3 / 9);
    }
  });

  it("treats an omitted status filter as no filter", async () => {
    await seedMixedList();
    const omitted = await getListWithTasks(repos, alice, list.id, { now: NOW });
    const empty = await getListWithTasks(repos, alice, list.id, { statuses: [], now: NOW });
    expect(titles(omitted)).toEqual(titles(empty));
    expect(omitted?.tasks).toHaveLength(9);
  });

  it("returns an empty list with zero counts and 0 progress, never NaN", async () => {
    const result = await getListWithTasks(repos, alice, list.id, { now: NOW });
    expect(result?.tasks).toEqual([]);
    expect(result?.totalUnfiltered).toBe(0);
    expect(result?.countsByStatus).toEqual({ new: 0, in_progress: 0, done: 0 });
    expect(result?.summary.progress).toBe(0);
    expect(result?.summary.indicator).toBe("none");
  });

  it("R-DATA-2: returns null for another user's list and for an unknown id", async () => {
    await seedMixedList();
    await expect(getListWithTasks(repos, bob, list.id, { now: NOW })).resolves.toBeNull();
    await expect(getListWithTasks(repos, alice, crypto.randomUUID(), { now: NOW })).resolves.toBeNull();
  });

  it("returns null once the list is deleted", async () => {
    await seedMixedList();
    await repos.lists.delete(alice, list.id);
    await expect(getListWithTasks(repos, alice, list.id, { now: NOW })).resolves.toBeNull();
  });
});
