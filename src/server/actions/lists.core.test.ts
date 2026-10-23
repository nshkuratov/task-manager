import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskFieldsOutput } from "@/contracts";
import { createTestDb, insertTestUser, type TestDb } from "@/server/db/testing";
import { createRepositories, type Repositories } from "@/server/repositories";
import { createActionRunner } from "./define-action";
import { listActionSpecs } from "./lists.core";
import { LIST_GONE } from "./tasks.core";

const NOW = new Date("2026-10-23T10:00:00Z");

let testDb: TestDb;
let repos: Repositories;
let alice: string;
let bob: string;
let sessionUser: string;
// Named fakes, as in tasks.core.test.ts: the session cookie and `revalidatePath` need a Next request.
let revalidate: ReturnType<typeof vi.fn<(path: string) => void>>;
let actions: ReturnType<typeof buildActions>;

function buildActions() {
  const defineAction = createActionRunner({
    getSession: () => Promise.resolve({ userId: sessionUser }),
    getRepositories: () => Promise.resolve(repos),
    revalidate,
  });
  const { createList, renameList, deleteList } = listActionSpecs;
  return {
    createList: defineAction(createList.schema, createList.handler, { revalidate: createList.revalidate }),
    renameList: defineAction(renameList.schema, renameList.handler, { revalidate: renameList.revalidate }),
    deleteList: defineAction(deleteList.schema, deleteList.handler, { revalidate: deleteList.revalidate }),
  };
}

const fields = (title: string): TaskFieldsOutput => ({
  title,
  description: "",
  status: "new",
  priority: "medium",
  deadline: null,
});

async function aliceList(name: string, taskTitles: string[] = []) {
  const list = await repos.lists.create(alice, name);
  for (const title of taskTitles) await repos.tasks.create(alice, list.id, fields(title));
  return list;
}

// Raw SQL through the test client: the repository's reads hide orphaned task rows behind the list join.
async function taskListIds(): Promise<string[]> {
  const result = await testDb.client.execute("select list_id from tasks order by list_id");
  return result.rows.map((row) => String(row.list_id));
}

beforeEach(async () => {
  testDb = await createTestDb();
  repos = createRepositories(testDb.db, { now: () => NOW });
  alice = await insertTestUser(testDb.db, "alice@example.com");
  bob = await insertTestUser(testDb.db, "bob@example.com");
  sessionUser = alice;
  revalidate = vi.fn();
  actions = buildActions();
});
afterEach(async () => {
  await testDb.cleanup();
});

describe("createList", () => {
  it("R-LIST-5, R-DATA-2: stores the trimmed name for the session user and revalidates the overview", async () => {
    const result = await actions.createList({ name: "  Groceries  " });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({ name: "Groceries", createdAt: NOW, updatedAt: NOW });
    await expect(repos.lists.get(alice, result.data.id)).resolves.toEqual(result.data);
    await expect(repos.lists.get(bob, result.data.id)).resolves.toBeNull();
    expect(revalidate.mock.calls).toEqual([["/lists"]]);
  });

  it("R-LIST-5: rejects a blank or too-long name with a field error and writes nothing", async () => {
    await expect(actions.createList({ name: "   " })).resolves.toEqual({
      ok: false,
      fieldErrors: { name: ["Name is required"] },
    });
    await expect(actions.createList({ name: "x".repeat(81) })).resolves.toEqual({
      ok: false,
      fieldErrors: { name: ["Name must be 80 characters or fewer"] },
    });
    await expect(repos.lists.listWithTaskFacts(alice)).resolves.toEqual([]);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("R-LIST-5: accepts a name of exactly 80 characters, read from FormData", async () => {
    const form = new FormData();
    form.set("name", "x".repeat(80));
    const result = await actions.createList(form);
    expect(result.ok && result.data.name).toBe("x".repeat(80));
  });
});

describe("renameList", () => {
  it("R-LIST-6, R-DATA-2: renames the list and revalidates the overview and the list", async () => {
    const list = await aliceList("Groceries");

    const result = await actions.renameList({ id: list.id, name: " Weekly groceries " });

    expect(result.ok && result.data.name).toBe("Weekly groceries");
    await expect(repos.lists.get(alice, list.id)).resolves.toMatchObject({ name: "Weekly groceries" });
    expect(revalidate.mock.calls).toEqual([["/lists"], [`/lists/${list.id}`]]);
  });

  it("R-LIST-6: an invalid name or a malformed id is a field error", async () => {
    const list = await aliceList("Groceries");
    await expect(actions.renameList({ id: list.id, name: "" })).resolves.toEqual({
      ok: false,
      fieldErrors: { name: ["Name is required"] },
    });
    await expect(actions.renameList({ id: "not-a-uuid", name: "Other" })).resolves.toEqual({
      ok: false,
      fieldErrors: { id: ["This list could not be found"] },
    });
    await expect(repos.lists.get(alice, list.id)).resolves.toMatchObject({ name: "Groceries" });
    expect(revalidate).not.toHaveBeenCalled();
  });
});

describe("deleteList", () => {
  it("R-LIST-7, R-DATA-2: deletes the list and only its tasks, and reports how many", async () => {
    const doomed = await aliceList("Home renovation", ["Tiles", "Paint", "Skip"]);
    const sibling = await aliceList("Work", ["Report"]);

    await expect(actions.deleteList({ id: doomed.id })).resolves.toEqual({ ok: true, data: { deletedTasks: 3 } });

    await expect(repos.lists.get(alice, doomed.id)).resolves.toBeNull();
    await expect(repos.lists.get(alice, sibling.id)).resolves.not.toBeNull();
    await expect(taskListIds()).resolves.toEqual([sibling.id]);
    expect(revalidate.mock.calls).toEqual([["/lists"], [`/lists/${doomed.id}`]]);
  });

  it("R-LIST-7: an empty list deletes with zero tasks", async () => {
    const list = await aliceList("Someday");
    await expect(actions.deleteList({ id: list.id })).resolves.toEqual({ ok: true, data: { deletedTasks: 0 } });
  });
});

describe("another user's list (IDOR) and missing lists", () => {
  it("R-DATA-2: rename and delete of a foreign list answer 'no longer exists' and change nothing", async () => {
    const list = await aliceList("Groceries", ["Milk"]);
    const before = await repos.lists.get(alice, list.id);
    sessionUser = bob;

    await expect(actions.renameList({ id: list.id, name: "Hijacked" })).resolves.toEqual({
      ok: false,
      formError: LIST_GONE,
    });
    await expect(actions.deleteList({ id: list.id })).resolves.toEqual({ ok: false, formError: LIST_GONE });

    await expect(repos.lists.get(alice, list.id)).resolves.toEqual(before);
    await expect(taskListIds()).resolves.toEqual([list.id]);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("R-DATA-2: a missing list gets the same answer as a foreign one", async () => {
    await expect(actions.renameList({ id: crypto.randomUUID(), name: "Ghost" })).resolves.toEqual({
      ok: false,
      formError: LIST_GONE,
    });
    await expect(actions.deleteList({ id: crypto.randomUUID() })).resolves.toEqual({
      ok: false,
      formError: LIST_GONE,
    });
    expect(revalidate).not.toHaveBeenCalled();
  });
});
