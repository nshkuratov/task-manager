import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TaskFieldsOutput } from "@/contracts/schemas/tasks";
import type { Task } from "@/contracts/task";
import { createTestDb, insertTestUser, type TestDb } from "@/server/db/testing";
import { createRepositories, type Repositories } from "@/server/repositories";
import { getTaskCard } from "./task-card";

const CREATED = new Date("2026-10-22T12:00:00Z");
const NOW = new Date("2026-10-23T12:00:00Z");
const HOUR_MS = 60 * 60 * 1000;

let testDb: TestDb;
let repos: Repositories;
let alice: string;
let bob: string;
let aliceListId: string;
let bobListId: string;

const fields = (overrides: Partial<TaskFieldsOutput> = {}): TaskFieldsOutput => ({
  title: "Write report",
  description: "Quarterly numbers",
  status: "new",
  priority: "high",
  deadline: null,
  ...overrides,
});

async function createTask(userId: string, listId: string, overrides: Partial<TaskFieldsOutput> = {}): Promise<Task> {
  const task = await repos.tasks.create(userId, listId, fields(overrides));
  if (task === null) throw new Error("test setup: task was not created");
  return task;
}

beforeEach(async () => {
  testDb = await createTestDb();
  repos = createRepositories(testDb.db, { now: () => CREATED });
  alice = await insertTestUser(testDb.db, "alice@example.com");
  bob = await insertTestUser(testDb.db, "bob@example.com");
  aliceListId = (await repos.lists.create(alice, "Work")).id;
  bobListId = (await repos.lists.create(bob, "Bob's list")).id;
});
afterEach(async () => {
  await testDb.cleanup();
});

describe("getTaskCard", () => {
  it("R-CARD-1, R-DATA-2: returns the owned task with every field, its list name, and the deadline info", async () => {
    const deadline = new Date(NOW.getTime() - 2 * HOUR_MS);
    const created = await createTask(alice, aliceListId, { deadline, status: "in_progress" });

    const card = await getTaskCard(repos, alice, created.id, { now: NOW });

    expect(card).toEqual({
      task: {
        id: created.id,
        listId: aliceListId,
        title: "Write report",
        description: "Quarterly numbers",
        status: "in_progress",
        priority: "high",
        deadline,
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      listName: "Work",
      deadlineInfo: { kind: "overdue", deltaMs: -2 * HOUR_MS },
    });
    // `task` must be a plain Task: the list name travels separately to the client.
    expect(card?.task).not.toHaveProperty("listName");
  });

  it.each([
    {
      name: "due within 48 hours",
      overrides: { deadline: new Date(NOW.getTime() + 5 * HOUR_MS) },
      info: { kind: "due-soon", deltaMs: 5 * HOUR_MS },
    },
    {
      name: "upcoming",
      overrides: { deadline: new Date(NOW.getTime() + 72 * HOUR_MS) },
      info: { kind: "upcoming", deltaMs: 72 * HOUR_MS },
    },
    {
      name: "done, even when past its deadline",
      overrides: { status: "done" as const, deadline: new Date(NOW.getTime() - HOUR_MS) },
      info: { kind: "done", deltaMs: -HOUR_MS },
    },
    { name: "undated", overrides: { deadline: null }, info: { kind: "none", deltaMs: null } },
  ])("describes the deadline for a fixed now: $name", async ({ overrides, info }) => {
    const created = await createTask(alice, aliceListId, overrides);
    const card = await getTaskCard(repos, alice, created.id, { now: NOW });
    expect(card?.deadlineInfo).toEqual(info);
  });

  it("R-DATA-2: another user's task is null, exactly like a missing one", async () => {
    const bobsTask = await createTask(bob, bobListId);

    await expect(getTaskCard(repos, alice, bobsTask.id, { now: NOW })).resolves.toBeNull();
    await expect(getTaskCard(repos, bob, bobsTask.id, { now: NOW })).resolves.not.toBeNull();
  });

  it("returns null for a well-formed id that matches no task", async () => {
    await expect(getTaskCard(repos, alice, crypto.randomUUID(), { now: NOW })).resolves.toBeNull();
  });

  it.each(["not-a-uuid", "", "../lists"])("returns null for a malformed id (%j)", async (taskId) => {
    await expect(getTaskCard(repos, alice, taskId, { now: NOW })).resolves.toBeNull();
  });

  it("reflects a deleted task as null", async () => {
    const created = await createTask(alice, aliceListId);
    await repos.tasks.delete(alice, created.id);
    await expect(getTaskCard(repos, alice, created.id, { now: NOW })).resolves.toBeNull();
  });
});
