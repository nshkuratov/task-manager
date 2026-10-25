import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { openDb } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { createTestDb, insertTestUser, makeTestDbDir, removeTestDbDir, type TestDb } from "@/server/db/testing";

const open: TestDb[] = [];
async function testDb(): Promise<TestDb> {
  const created = await createTestDb();
  open.push(created);
  return created;
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((created) => created.cleanup()));
});

const foreignKeys = (rows: readonly Record<string, unknown>[]) => rows[0]?.["foreign_keys"];

describe("migrations", () => {
  it("R-DATA-1: create every table on an empty database", async () => {
    const { client } = await testDb();
    const tables = await client.execute(
      "select name from sqlite_master where type = 'table' and name not like '\\_%' escape '\\' and name != 'sqlite_sequence' order by name",
    );
    expect(tables.rows.map((row) => row["name"])).toEqual(["lists", "tasks", "users"]);
  });

  it("report every committed migration as applied on an empty database, then none the second time", async () => {
    const dir = await makeTestDbDir("task-manager-migrate-");
    const { db, client } = await openDb({
      databaseUrl: `file:${path.join(dir, "empty.db")}`,
      databaseAuthToken: undefined,
    });
    try {
      const journal = z
        .object({ entries: z.array(z.unknown()) })
        .parse(JSON.parse(await readFile(path.resolve("drizzle/meta/_journal.json"), "utf8")));
      expect(journal.entries.length).toBeGreaterThan(0);
      expect(await runMigrations(db)).toBe(journal.entries.length);
      expect(await runMigrations(db)).toBe(0);
    } finally {
      client.close();
      await removeTestDbDir(dir);
    }
  });

  it("leave foreign keys enforced, also on the connection a batch uses", async () => {
    const { client } = await testDb();
    expect(foreignKeys((await client.execute("PRAGMA foreign_keys")).rows)).toBe(1);
    const [inBatch] = await client.batch(["PRAGMA foreign_keys"], "write");
    expect(foreignKeys(inBatch?.rows ?? [])).toBe(1);
    await expect(
      client.execute(
        "insert into lists (id, user_id, name, created_at, updated_at) values ('l', 'no-such-user', 'x', 0, 0)",
      ),
    ).rejects.toThrow(/FOREIGN KEY/);
  });

  it("reject an invalid status or priority at the SQL level", async () => {
    const { db, client } = await testDb();
    const userId = await insertTestUser(db, "a@example.com");
    await client.execute({
      sql: "insert into lists (id, user_id, name, created_at, updated_at) values ('l1', ?, 'List', 0, 0)",
      args: [userId],
    });
    const insertTask = (status: string, priority: string) =>
      client.execute({
        sql: "insert into tasks (id, list_id, title, status, priority, created_at, updated_at) values (?, 'l1', 't', ?, ?, 0, 0)",
        args: [crypto.randomUUID(), status, priority],
      });

    await expect(insertTask("bogus", "high")).rejects.toThrow(/CHECK constraint failed: tasks_status_check/);
    await expect(insertTask("new", "urgent")).rejects.toThrow(/CHECK constraint failed: tasks_priority_check/);
    await expect(insertTask("in_progress", "low")).resolves.toBeDefined();
    expect((await db.all<{ n: number }>(sql`select count(*) as n from tasks`))[0]?.n).toBe(1);
  });

  it("R-LIST-5, R-TASKS-2: rename duplicates left from before the rule, then enforce unique names", async () => {
    const { db, client } = await testDb();
    const userId = await insertTestUser(db, "a@example.com");
    const LONG = "x".repeat(80);
    // Back to the pre-0001 schema, with the duplicates an older deploy could hold.
    await client.executeMultiple(
      "drop index lists_user_id_name_unique; drop index tasks_list_id_title_unique;" +
        `insert into lists (id, user_id, name, created_at, updated_at) values
           ('aaaaaaaa-1', '${userId}', 'Groceries', 0, 0), ('bbbbbbbb-2', '${userId}', 'groceries', 1, 1),
           ('ffffffff-1', '${userId}', '${LONG}', 2, 2), ('gggggggg-2', '${userId}', '${LONG.toUpperCase()}', 3, 3);` +
        `insert into tasks (id, list_id, title, status, priority, created_at, updated_at) values
           ('cccccccc-1', 'aaaaaaaa-1', 'Report', 'new', 'low', 0, 0),
           ('dddddddd-2', 'aaaaaaaa-1', 'REPORT', 'new', 'low', 1, 1),
           ('eeeeeeee-3', 'bbbbbbbb-2', 'Report', 'new', 'low', 2, 2);`,
    );

    const migration = await readFile(path.resolve("drizzle/0001_unique_names.sql"), "utf8");
    for (const statement of migration.split("--> statement-breakpoint")) await client.execute(statement);

    const names = await client.execute("select id, name from lists order by id");
    expect(names.rows.map((row) => row["name"])).toEqual([
      "Groceries",
      "groceries (bbbbbbbb)",
      LONG,
      `${LONG.toUpperCase().slice(0, 69)} (gggggggg)`,
    ]);
    // Still within the 80-character form limit, so the renamed list can be edited and saved.
    expect(names.rows.every((row) => String(row["name"]).length <= 80)).toBe(true);
    const titles = await client.execute("select id, title from tasks order by id");
    expect(titles.rows.map((row) => row["title"])).toEqual(["Report", "REPORT (dddddddd)", "Report"]);
    await expect(
      client.execute(
        `insert into lists (id, user_id, name, created_at, updated_at) values ('x', '${userId}', 'GROCERIES', 2, 2)`,
      ),
    ).rejects.toThrow(/UNIQUE constraint failed: index 'lists_user_id_name_unique'/);
  });
});

describe("createTestDb", () => {
  it("gives every database its own path and removes it on cleanup", async () => {
    const first = await createTestDb();
    const second = await createTestDb();
    expect(first.path).not.toBe(second.path);
    expect(existsSync(first.path)).toBe(true);

    await first.cleanup();
    await second.cleanup();
    expect(existsSync(first.path)).toBe(false);
    expect(existsSync(second.path)).toBe(false);
  });
});
