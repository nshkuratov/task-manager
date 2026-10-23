import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TaskFieldsOutput } from "@/contracts/schemas/tasks";
import type { TaskList } from "@/contracts/task";
import { tasks } from "@/server/db/schema";
import { createTestDb, insertTestUser, type TestDb } from "@/server/db/testing";
import { createRepositories, type Repositories } from "@/server/repositories";

const START = new Date("2026-10-22T12:00:00Z");
let clock: Date;
let testDb: TestDb;
let repos: Repositories;
let alice: string;
let bob: string;
let list: TaskList;

const fields = (overrides: Partial<TaskFieldsOutput> = {}): TaskFieldsOutput => ({
  title: "Write report",
  description: "Quarterly numbers",
  status: "new",
  priority: "medium",
  deadline: null,
  ...overrides,
});
const rawRow = async (id: string) => (await testDb.db.select().from(tasks).where(eq(tasks.id, id)))[0];
async function createTask(overrides: Partial<TaskFieldsOutput> = {}) {
  const task = await repos.tasks.create(alice, list.id, fields(overrides));
  if (task === null) throw new Error("test setup: task was not created");
  return task;
}

beforeEach(async () => {
  clock = START;
  testDb = await createTestDb();
  repos = createRepositories(testDb.db, { now: () => clock });
  alice = await insertTestUser(testDb.db, "alice@example.com");
  bob = await insertTestUser(testDb.db, "bob@example.com");
  list = await repos.lists.create(alice, "Work");
});
afterEach(async () => {
  await testDb.cleanup();
});

describe("tasks repository", () => {
  it("R-TASKS-2, R-DATA-1: creates a task with every field and stamps both timestamps from the clock", async () => {
    const deadline = new Date("2026-10-24T21:59:00.000Z");
    const task = await createTask({ priority: "high", status: "in_progress", deadline });
    expect(task).toEqual({
      id: expect.any(String),
      listId: list.id,
      title: "Write report",
      description: "Quarterly numbers",
      status: "in_progress",
      priority: "high",
      deadline,
      createdAt: START,
      updatedAt: START,
    });
  });

  it("round-trips deadlines exactly, to the millisecond, and null", async () => {
    const precise = new Date("2026-12-31T23:59:59.987Z");
    const dated = await createTask({ deadline: precise });
    const undated = await createTask({ deadline: null });
    expect((await repos.tasks.get(alice, dated.id))?.deadline?.getTime()).toBe(precise.getTime());
    expect((await rawRow(dated.id))?.deadline).toBe(precise.getTime());
    expect((await repos.tasks.get(alice, undated.id))?.deadline).toBeNull();
  });

  it("refuses to create a task in another user's list or a missing list", async () => {
    expect(await repos.tasks.create(bob, list.id, fields())).toBeNull();
    expect(await repos.tasks.create(alice, crypto.randomUUID(), fields())).toBeNull();
    expect(await repos.tasks.listForList(alice, list.id)).toEqual([]);
  });

  it("R-TASKS-3: updates every field, advancing updatedAt but not createdAt", async () => {
    const task = await createTask();
    clock = new Date(START.getTime() + 5000);
    const deadline = new Date("2026-11-01T10:00:00Z");
    const updated = await repos.tasks.update(
      alice,
      task.id,
      fields({ title: "Final report", description: "", status: "done", priority: "low", deadline }),
    );
    expect(updated).toEqual({
      ...task,
      title: "Final report",
      description: "",
      status: "done",
      priority: "low",
      deadline,
      updatedAt: clock,
    });
  });

  it("R-TASKS-5: changes only the status (and updatedAt)", async () => {
    const task = await createTask({ deadline: new Date("2026-11-01T10:00:00Z") });
    clock = new Date(START.getTime() + 1000);
    expect(await repos.tasks.setStatus(alice, task.id, "done")).toEqual({ ...task, status: "done", updatedAt: clock });
  });

  it("returns null for another user's task and changes no row", async () => {
    const task = await createTask();
    const before = await rawRow(task.id);

    expect(await repos.tasks.get(bob, task.id)).toBeNull();
    expect(await repos.tasks.update(bob, task.id, fields({ title: "Hijacked" }))).toBeNull();
    expect(await repos.tasks.setStatus(bob, task.id, "done")).toBeNull();
    expect(await repos.tasks.delete(bob, task.id)).toBeNull();
    expect(await repos.tasks.listForList(bob, list.id)).toBeNull();

    expect(await rawRow(task.id)).toEqual(before);
  });

  it("returns null for a task that does not exist", async () => {
    const missing = crypto.randomUUID();
    expect(await repos.tasks.get(alice, missing)).toBeNull();
    expect(await repos.tasks.update(alice, missing, fields())).toBeNull();
    expect(await repos.tasks.setStatus(alice, missing, "done")).toBeNull();
    expect(await repos.tasks.delete(alice, missing)).toBeNull();
    expect(await repos.tasks.listForList(alice, crypto.randomUUID())).toBeNull();
  });

  it("R-CARD-1: gets a task with its list's name", async () => {
    const task = await createTask();
    expect(await repos.tasks.get(alice, task.id)).toEqual({ ...task, listName: "Work" });
  });

  it("lists a list's tasks in creation order, and only that list's", async () => {
    const other = await repos.lists.create(alice, "Other");
    const first = await createTask({ title: "First" });
    clock = new Date(START.getTime() + 1000);
    const second = await createTask({ title: "Second" });
    await repos.tasks.create(alice, other.id, fields({ title: "Elsewhere" }));

    expect(await repos.tasks.listForList(alice, list.id)).toEqual([first, second]);
  });

  it("R-TASKS-4: deletes a task and returns its list id", async () => {
    const task = await createTask();
    expect(await repos.tasks.delete(alice, task.id)).toEqual({ listId: list.id });
    expect(await rawRow(task.id)).toBeUndefined();
    expect(await repos.tasks.delete(alice, task.id)).toBeNull();
  });

  it("rejects instead of swallowing when the database is gone", async () => {
    testDb.client.close();
    await expect(repos.tasks.listForList(alice, list.id)).rejects.toThrow();
  });
});
