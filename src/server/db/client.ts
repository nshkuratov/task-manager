import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { parseDbEnv, type DatabaseEnv } from "./env";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema> & { $client: Client };

export interface OpenedDb {
  db: Db;
  client: Client;
}

/** The filesystem path of a `file:` URL, or `null` for a remote URL. */
export function fileDbPath(databaseUrl: string): string | null {
  if (!databaseUrl.startsWith("file:")) return null;
  const file = databaseUrl.slice("file:".length).split("?")[0] ?? "";
  return path.resolve(file.replace(/^\/\/+/, "/"));
}

export function ensureFileDbDir(databaseUrl: string): void {
  const file = fileDbPath(databaseUrl);
  if (file !== null) mkdirSync(path.dirname(file), { recursive: true });
}

export async function openDb({ databaseUrl, databaseAuthToken }: DatabaseEnv): Promise<OpenedDb> {
  const client = createClient({
    url: databaseUrl,
    ...(databaseAuthToken === undefined ? {} : { authToken: databaseAuthToken }),
  });
  // The bundled libsql build already defaults foreign keys on for every pooled connection; this states
  // the requirement instead of relying on a compile flag.
  if (fileDbPath(databaseUrl) !== null) await client.execute("PRAGMA foreign_keys = ON");
  return { db: drizzle({ client, schema }), client };
}

let pending: Promise<Db> | undefined;

/** The app's database, opened once per process. A failed open is not cached, so the next call retries. */
export function getDb(): Promise<Db> {
  pending ??= (async () => {
    const env = parseDbEnv(process.env);
    ensureFileDbDir(env.databaseUrl);
    return (await openDb(env)).db;
  })().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}
