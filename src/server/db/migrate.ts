import "server-only";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { Db } from "./client";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../drizzle", import.meta.url));

async function appliedCount(db: Db): Promise<number> {
  const exists = await db.all<{ n: number }>(
    sql`select count(*) as n from sqlite_master where type = 'table' and name = '__drizzle_migrations'`,
  );
  if (exists[0]?.n !== 1) return 0;
  const rows = await db.all<{ n: number }>(sql`select count(*) as n from __drizzle_migrations`);
  return rows[0]?.n ?? 0;
}

/** Applies the committed migrations and returns how many were newly applied. */
export async function runMigrations(db: Db): Promise<number> {
  const before = await appliedCount(db);
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return (await appliedCount(db)) - before;
}
