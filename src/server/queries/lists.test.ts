import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TaskFieldsOutput } from "@/contracts/schemas/tasks";
import { createTestDb, insertTestUser, type TestDb } from "@/server/db/testing";
import { createRepositories, type Repositories } from "@/server/repositories";
import { getListSummaries } from "./lists";

const HOUR = 60 * 60 * 1000;
// The query's `now`, separate from the clock the repository stamps rows with.
const NOW = new Date("2026-10-23T12:00:00Z");
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

let clock: Date;
let testDb: TestDb;
let repos: Repositories;
let alice: string;
let bob: string;

const fields = (overrides: Partial<TaskFieldsOutput> = {}): TaskFieldsOutput => ({
  title: "Task",
  description: "",
  status: "new",
  priority: "medium",
  deadline: null,
  ...overrides,
});

// Steps the write clock so `createdAt` never ties: a tie would fall back to ordering by random id.
async function createList(userId: string, name: string, tasks: Partial<TaskFieldsOutput>[] = []) {
  clock = new Date(clock.getTime() + 1000);
  const list = await repos.lists.create(userId, name);
  for (const task of tasks) await repos.tasks.create(userId, list.id, fields(task));
  return list;
}

beforeEach(async () => {
  clock = new Date("2026-10-01T00:00:00Z");
  testDb = await createTestDb();
  repos = createRepositories(testDb.db, { now: () => clock });
  alice = await insertTestUser(testDb.db, "alice@example.com");
  bob = await insertTestUser(testDb.db, "bob@example.com");
});
afterEach(async () => {
  await testDb.cleanup();
});

describe("getListSummaries", () => {
  it("R-LIST-2, R-LIST-3, R-LIST-4: summarises every list for the given now, newest first", async () => {
    const overdue = await createList(alice, "Launch", [
      { status: "in_progress", deadline: at(-1 * HOUR) },
      { status: "new", deadline: at(30 * HOUR) },
      { status: "done", deadline: at(-5 * HOUR) },
    ]);
    const dueSoon = await createList(alice, "Home", [
      { status: "new", deadline: at(48 * HOUR) },
      { status: "done", deadline: null },
    ]);
    const calm = await createList(alice, "Reading", [{ status: "done", deadline: at(-HOUR) }]);
    const empty = await createList(alice, "Someday");

    const { summaries, total } = await getListSummaries(repos, alice, { now: NOW });

    expect(total).toBe(4);
    expect(summaries.map((s) => s.list.id)).toEqual([empty.id, calm.id, dueSoon.id, overdue.id]);
    expect(summaries.map(({ counters, progress, indicator }) => ({ counters, progress, indicator }))).toEqual([
      { counters: { new: 0, inProgress: 0, done: 0, overdue: 0, total: 0 }, progress: 0, indicator: "none" },
      { counters: { new: 0, inProgress: 0, done: 1, overdue: 0, total: 1 }, progress: 1, indicator: "none" },
      { counters: { new: 1, inProgress: 0, done: 1, overdue: 0, total: 2 }, progress: 0.5, indicator: "due-soon" },
      {
        counters: { new: 1, inProgress: 1, done: 1, overdue: 1, total: 3 },
        progress: 1 / 3,
        indicator: "overdue",
      },
    ]);
  });

  it("R-LIST-4: the same lists judged a day later turn red", async () => {
    await createList(alice, "Home", [{ status: "new", deadline: at(20 * HOUR) }]);
    const later = await getListSummaries(repos, alice, { now: at(24 * HOUR) });
    expect(later.summaries.map((s) => s.indicator)).toEqual(["overdue"]);
  });

  it("R-LIST-8: filters by name ignoring case and accents, Cyrillic included, keeping the unfiltered total", async () => {
    await createList(alice, "Покупки на неделю");
    await createList(alice, "Café visits");
    await createList(alice, "Work");

    const names = async (q: string) =>
      (await getListSummaries(repos, alice, { q, now: NOW })).summaries.map((s) => s.list.name);

    await expect(names("ПОКУП")).resolves.toEqual(["Покупки на неделю"]);
    await expect(names("cafe")).resolves.toEqual(["Café visits"]);
    await expect(names("  work ")).resolves.toEqual(["Work"]);
    await expect(getListSummaries(repos, alice, { q: "garden", now: NOW })).resolves.toEqual({
      summaries: [],
      total: 3,
    });
  });

  it("R-LIST-8: a blank or missing query returns every list", async () => {
    await createList(alice, "One");
    await createList(alice, "Two");
    expect((await getListSummaries(repos, alice, { q: undefined, now: NOW })).summaries).toHaveLength(2);
    expect((await getListSummaries(repos, alice, { q: "   ", now: NOW })).summaries).toHaveLength(2);
  });

  it("returns nothing for a user without lists", async () => {
    await expect(getListSummaries(repos, alice, { now: NOW })).resolves.toEqual({ summaries: [], total: 0 });
  });

  it("R-DATA-2: another user's lists never appear, not even through a matching query", async () => {
    await createList(bob, "Bob's groceries", [{ status: "new", deadline: at(-HOUR) }]);
    const mine = await createList(alice, "Alice's groceries");

    const result = await getListSummaries(repos, alice, { q: "groceries", now: NOW });

    expect(result.total).toBe(1);
    expect(result.summaries.map((s) => s.list.id)).toEqual([mine.id]);
  });
});
