import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskFieldsOutput, TaskList } from "@/contracts";
import { createTestDb, insertTestUser, type TestDb } from "@/server/db/testing";
import { createRepositories, type Repositories } from "@/server/repositories";
import { createActionRunner } from "./define-action";
import { LIST_GONE, TASK_GONE, TASK_TITLE_TAKEN, taskActionSpecs } from "./tasks.core";

const NOW = new Date("2026-10-22T10:00:00Z");

let testDb: TestDb;
let repos: Repositories;
let alice: string;
let bob: string;
let list: TaskList;
let sessionUser: string;
// Named fakes, as in define-action.test.ts: the session cookie and `revalidatePath` need a Next request.
let revalidate: ReturnType<typeof vi.fn<(path: string) => void>>;
let actions: ReturnType<typeof buildActions>;

function buildActions() {
  const defineAction = createActionRunner({
    getSession: () => Promise.resolve({ userId: sessionUser }),
    getRepositories: () => Promise.resolve(repos),
    revalidate,
  });
  const { createTask, updateTask, setTaskStatus, deleteTask } = taskActionSpecs;
  return {
    createTask: defineAction(createTask.schema, createTask.handler, { revalidate: createTask.revalidate }),
    updateTask: defineAction(updateTask.schema, updateTask.handler, { revalidate: updateTask.revalidate }),
    setTaskStatus: defineAction(setTaskStatus.schema, setTaskStatus.handler, {
      revalidate: setTaskStatus.revalidate,
    }),
    deleteTask: defineAction(deleteTask.schema, deleteTask.handler, { revalidate: deleteTask.revalidate }),
  };
}

const tasksInList = async () => (await repos.tasks.listForList(alice, list.id)) ?? [];
const fields = (title: string): TaskFieldsOutput => ({
  title,
  description: "",
  status: "new",
  priority: "medium",
  deadline: null,
});

async function aliceTask(title = "Write report") {
  const result = await actions.createTask({ listId: list.id, title, deadline: null });
  if (!result.ok) throw new Error("test setup: task was not created");
  revalidate.mockClear();
  return result.data;
}

beforeEach(async () => {
  testDb = await createTestDb();
  repos = createRepositories(testDb.db, { now: () => NOW });
  alice = await insertTestUser(testDb.db, "alice@example.com");
  bob = await insertTestUser(testDb.db, "bob@example.com");
  list = await repos.lists.create(alice, "Work");
  sessionUser = alice;
  revalidate = vi.fn();
  actions = buildActions();
});
afterEach(async () => {
  await testDb.cleanup();
});

describe("createTask", () => {
  it("R-TASKS-2, R-DATA-2: stores the parsed fields and revalidates the lists, the list and the card", async () => {
    const result = await actions.createTask({
      listId: list.id,
      title: "  Write report  ",
      description: " Quarterly numbers ",
      status: "in_progress",
      priority: "high",
      deadline: "2026-10-24T23:59:00+02:00",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stored = await repos.tasks.get(alice, result.data.id);
    expect(stored).toMatchObject({
      listId: list.id,
      title: "Write report",
      description: "Quarterly numbers",
      status: "in_progress",
      priority: "high",
      deadline: new Date("2026-10-24T21:59:00.000Z"),
    });
    expect(revalidate.mock.calls).toEqual([["/lists"], [`/lists/${list.id}`], [`/tasks/${result.data.id}`]]);
  });

  it("R-TASKS-2: applies the schema defaults and an empty deadline means none", async () => {
    const result = await actions.createTask({ listId: list.id, title: "Call Bob", deadline: "" });
    expect(result.ok && result.data).toMatchObject({
      description: "",
      status: "new",
      priority: "medium",
      deadline: null,
    });
  });

  it("R-TASKS-2: rejects invalid input with field errors and writes nothing", async () => {
    const result = await actions.createTask({ listId: list.id, title: "   ", deadline: "tomorrow" });

    expect(result).toEqual({
      ok: false,
      fieldErrors: { title: ["Title is required"], deadline: ["Enter a valid deadline"] },
    });
    await expect(tasksInList()).resolves.toEqual([]);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("R-DATA-2: refuses another user's list and a missing one without writing", async () => {
    sessionUser = bob;
    await expect(actions.createTask({ listId: list.id, title: "Sneaky", deadline: null })).resolves.toEqual({
      ok: false,
      formError: LIST_GONE,
    });
    await expect(actions.createTask({ listId: crypto.randomUUID(), title: "Orphan", deadline: null })).resolves.toEqual(
      { ok: false, formError: LIST_GONE },
    );

    await expect(tasksInList()).resolves.toEqual([]);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("R-TASKS-2: rejects a title the list already has, case-insensitively, and writes nothing", async () => {
    await aliceTask("Write report");

    await expect(actions.createTask({ listId: list.id, title: " write REPORT ", deadline: null })).resolves.toEqual({
      ok: false,
      fieldErrors: { title: [TASK_TITLE_TAKEN] },
    });
    await expect(tasksInList()).resolves.toHaveLength(1);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("R-TASKS-2: the same title in another list is not a conflict", async () => {
    const other = await repos.lists.create(alice, "Home");
    await aliceTask("Write report");

    await expect(
      actions.createTask({ listId: other.id, title: "Write report", deadline: null }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("R-TASKS-2: rejects a non-ASCII duplicate, exact or in another case", async () => {
    await aliceTask("Отчёт");

    for (const title of ["Отчёт", "отчёт", "ОТЧЁТ"]) {
      await expect(actions.createTask({ listId: list.id, title, deadline: null })).resolves.toEqual({
        ok: false,
        fieldErrors: { title: [TASK_TITLE_TAKEN] },
      });
    }
    await expect(tasksInList()).resolves.toHaveLength(1);
  });

  it("R-TASKS-2: a duplicate that passes the check in a race is still a field error, not a crash", async () => {
    await aliceTask("Write report");
    // Stubbed: a concurrent submit cannot be made deterministic in-process, so the pre-check is told the title is
    // free and the database's unique index has to catch it.
    repos = { ...repos, tasks: { ...repos.tasks, isTitleTaken: () => Promise.resolve(false) } };
    actions = buildActions();

    await expect(actions.createTask({ listId: list.id, title: "write report", deadline: null })).resolves.toEqual({
      ok: false,
      fieldErrors: { title: [TASK_TITLE_TAKEN] },
    });
    await expect(tasksInList()).resolves.toHaveLength(1);
  });
});

describe("updateTask", () => {
  it("R-TASKS-3, R-CARD-2: changes only the given task and revalidates its pages", async () => {
    const target = await aliceTask("Write report");
    const sibling = await aliceTask("Book flights");

    const result = await actions.updateTask({
      id: target.id,
      title: "Write the final report",
      description: "With charts",
      status: "done",
      priority: "low",
      deadline: "2026-10-30T09:00:00+01:00",
    });

    expect(result.ok).toBe(true);
    await expect(repos.tasks.get(alice, target.id)).resolves.toMatchObject({
      title: "Write the final report",
      description: "With charts",
      status: "done",
      priority: "low",
      deadline: new Date("2026-10-30T08:00:00.000Z"),
    });
    await expect(repos.tasks.get(alice, sibling.id)).resolves.toEqual({ ...sibling, listName: "Work" });
    expect(revalidate.mock.calls).toEqual([["/lists"], [`/lists/${list.id}`], [`/tasks/${target.id}`]]);
  });

  it("R-TASKS-3: clears the deadline when it is submitted empty", async () => {
    const created = await actions.createTask({
      listId: list.id,
      title: "Dated",
      deadline: "2026-10-24T23:59:00+02:00",
    });
    if (!created.ok) throw new Error("test setup");

    await actions.updateTask({ id: created.data.id, title: "Dated", deadline: "" });
    await expect(repos.tasks.get(alice, created.data.id)).resolves.toMatchObject({ deadline: null });
  });

  it("R-TASKS-3: rejects a rename to a title another task in the list has, keeping its own title allowed", async () => {
    const target = await aliceTask("Write report");
    await aliceTask("Book flights");

    await expect(actions.updateTask({ id: target.id, title: " book FLIGHTS ", deadline: null })).resolves.toEqual({
      ok: false,
      fieldErrors: { title: [TASK_TITLE_TAKEN] },
    });
    await expect(actions.updateTask({ id: target.id, title: "Write report", deadline: null })).resolves.toMatchObject({
      ok: true,
    });
    await expect(repos.tasks.get(alice, target.id)).resolves.toMatchObject({ title: "Write report" });
  });

  it("R-TASKS-3: a title only another list has is not a conflict", async () => {
    const target = await aliceTask("Write report");
    const other = await repos.lists.create(alice, "Home");
    await repos.tasks.create(alice, other.id, fields("Book flights"));

    await expect(actions.updateTask({ id: target.id, title: "Book flights", deadline: null })).resolves.toMatchObject({
      ok: true,
    });
  });

  it("R-TASKS-3: editing other fields of a task whose unchanged title already collides still saves", async () => {
    // Rows from before the duplicate rule, or a Unicode case variant the ASCII-only index lets through.
    const target = await repos.tasks.create(alice, list.id, fields("Отчёт"));
    await repos.tasks.create(alice, list.id, fields("отчёт"));
    if (target === null) throw new Error("test setup");

    await expect(
      actions.updateTask({ id: target.id, title: "Отчёт", description: "Q3 numbers", deadline: null }),
    ).resolves.toMatchObject({ ok: true, data: { description: "Q3 numbers" } });
  });
});

describe("setTaskStatus", () => {
  it("R-TASKS-5, R-DATA-2: persists the new status and revalidates", async () => {
    const task = await aliceTask();

    const result = await actions.setTaskStatus({ id: task.id, status: "done" });

    expect(result.ok && result.data.status).toBe("done");
    await expect(repos.tasks.get(alice, task.id)).resolves.toMatchObject({ status: "done", title: task.title });
    expect(revalidate.mock.calls).toEqual([["/lists"], [`/lists/${list.id}`], [`/tasks/${task.id}`]]);
  });

  it("R-TASKS-5: requires a status instead of resetting to the create default", async () => {
    const task = await aliceTask();
    const form = new FormData();
    form.set("id", task.id);
    const result = await actions.setTaskStatus(form);

    expect(result).toMatchObject({ ok: false, fieldErrors: { status: ["Choose a valid status"] } });
    await expect(repos.tasks.get(alice, task.id)).resolves.toMatchObject({ status: "new" });
  });
});

describe("deleteTask", () => {
  it("R-TASKS-4, R-DATA-2: removes the row, returns its list and revalidates", async () => {
    const task = await aliceTask();
    const kept = await aliceTask("Keep me");

    await expect(actions.deleteTask({ id: task.id })).resolves.toEqual({ ok: true, data: { listId: list.id } });

    await expect(repos.tasks.get(alice, task.id)).resolves.toBeNull();
    expect((await tasksInList()).map((t) => t.id)).toEqual([kept.id]);
    expect(revalidate.mock.calls).toEqual([["/lists"], [`/lists/${list.id}`], [`/tasks/${task.id}`]]);
  });

  it("R-TASKS-4: a task that is already gone is reported, not thrown", async () => {
    await expect(actions.deleteTask({ id: crypto.randomUUID() })).resolves.toEqual({
      ok: false,
      formError: TASK_GONE,
    });
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("rejects a malformed id as a field error, before touching the database", async () => {
    const task = await aliceTask();
    await expect(actions.deleteTask({ id: "not-a-uuid" })).resolves.toEqual({
      ok: false,
      fieldErrors: { id: ["This task could not be found"] },
    });
    await expect(repos.tasks.get(alice, task.id)).resolves.not.toBeNull();
    expect(revalidate).not.toHaveBeenCalled();
  });
});

describe("another user's task (IDOR)", () => {
  it("R-DATA-2: update, status change and delete all answer 'no longer exists' and leave the row untouched", async () => {
    const task = await aliceTask();
    const before = await repos.tasks.get(alice, task.id);
    sessionUser = bob;

    const attempts = await Promise.all([
      actions.updateTask({ id: task.id, title: "Hijacked", deadline: null }),
      actions.setTaskStatus({ id: task.id, status: "done" }),
      actions.deleteTask({ id: task.id }),
    ]);

    expect(attempts).toEqual([
      { ok: false, formError: TASK_GONE },
      { ok: false, formError: TASK_GONE },
      { ok: false, formError: TASK_GONE },
    ]);
    await expect(repos.tasks.get(alice, task.id)).resolves.toEqual(before);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("R-DATA-2: a missing task gets the same answer as a foreign one", async () => {
    await expect(actions.updateTask({ id: crypto.randomUUID(), title: "x", deadline: null })).resolves.toEqual({
      ok: false,
      formError: TASK_GONE,
    });
    await expect(actions.setTaskStatus({ id: crypto.randomUUID(), status: "done" })).resolves.toEqual({
      ok: false,
      formError: TASK_GONE,
    });
  });
});
