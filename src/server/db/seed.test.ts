import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lists, tasks, users } from "@/server/db/schema";
import { ADMIN_EMAIL, ADMIN_PASSWORD, formatSeedResult, seed } from "@/server/db/seed";
import { buildDemoData } from "@/server/db/seed-data";
import { createTestDb, type TestDb } from "@/server/db/testing";

const NOW = new Date("2026-10-22T12:00:00Z");
let testDb: TestDb;

beforeEach(async () => {
  testDb = await createTestDb();
});
afterEach(async () => {
  await testDb.cleanup();
});

const count = async (table: typeof users | typeof lists | typeof tasks) =>
  (await testDb.db.select({ n: sql<number>`count(*)` }).from(table))[0]?.n;
const adminHash = async () =>
  (await testDb.db.select({ hash: users.passwordHash }).from(users).where(eq(users.email, ADMIN_EMAIL)))[0]?.hash;

describe("seed", () => {
  it("R-AUTH-4: seeds the admin with a bcrypt hash of the documented password, never the plaintext", async () => {
    expect(await seed(testDb.db, { now: NOW })).toEqual({ userCreated: true, listsInserted: 4 });
    const hash = await adminHash();
    expect(hash).toBeDefined();
    expect(hash).not.toContain(ADMIN_PASSWORD);
    expect(await bcrypt.compare(ADMIN_PASSWORD, hash ?? "")).toBe(true);
    expect(await bcrypt.compare("admin123!", hash ?? "")).toBe(false);
  });

  it("is idempotent: a second run keeps one user, the same hash, and the same lists", async () => {
    await seed(testDb.db, { now: NOW });
    const firstHash = await adminHash();
    const second = await seed(testDb.db, { now: new Date(NOW.getTime() + 60_000) });

    expect(second).toEqual({ userCreated: false, listsInserted: 0 });
    expect(formatSeedResult(second)).toBe("seeded: user exists, 0 lists inserted (already seeded)");
    expect(await count(users)).toBe(1);
    expect(await count(lists)).toBe(4);
    expect(await adminHash()).toBe(firstHash);
  });

  it("inserts every demo task, with deadlines relative to the seed time", async () => {
    await seed(testDb.db, { now: NOW });
    const demoTasks = buildDemoData(NOW).flatMap((list) => list.tasks);
    expect(await count(tasks)).toBe(demoTasks.length);

    const [overdue] = await testDb.db
      .select({ deadline: tasks.deadline })
      .from(tasks)
      .where(eq(tasks.title, "Finalize pricing page copy"));
    expect(overdue?.deadline).toBe(NOW.getTime() - 24 * 60 * 60 * 1000);
  });

  it("adds nothing when the admin already has a list", async () => {
    await seed(testDb.db, { now: NOW });
    await testDb.db.delete(lists).where(sql`${lists.name} != 'Someday'`);
    expect(await seed(testDb.db, { now: NOW })).toEqual({ userCreated: false, listsInserted: 0 });
    expect(await count(lists)).toBe(1);
  });

  it("gives an existing admin with no lists the demo lists", async () => {
    await seed(testDb.db, { now: NOW });
    await testDb.db.delete(lists);
    const result = await seed(testDb.db, { now: NOW });
    expect(result).toEqual({ userCreated: false, listsInserted: 4 });
    expect(formatSeedResult(result)).toBe("seeded: user exists, 4 lists inserted");
  });

  it("leaves no demo lists behind when the batch fails part-way, so a re-run still seeds", async () => {
    await testDb.client.execute(
      "CREATE TRIGGER fail_late_task BEFORE INSERT ON tasks WHEN NEW.title = 'Thinking in Systems' BEGIN SELECT RAISE(ABORT, 'injected failure'); END",
    );
    await expect(seed(testDb.db, { now: NOW })).rejects.toThrow();
    expect(await count(lists)).toBe(0);
    expect(await count(tasks)).toBe(0);

    await testDb.client.execute("DROP TRIGGER fail_late_task");
    expect(await seed(testDb.db, { now: NOW })).toEqual({ userCreated: false, listsInserted: 4 });
  });

  it("formats the first run's line", () => {
    expect(formatSeedResult({ userCreated: true, listsInserted: 4 })).toBe("seeded: user created, 4 lists inserted");
  });
});
