import "server-only";
import { existsSync } from "node:fs";
import { ensureFileDbDir, fileDbPath, openDb, type OpenedDb } from "../client";
import { parseDbEnv, type DatabaseEnv } from "../env";

/** Reads `.env` when present, then validates only the database variables (no session secret needed). */
export function loadCliEnv(): DatabaseEnv {
  if (existsSync(".env")) process.loadEnvFile(".env");
  return parseDbEnv(process.env);
}

export async function openCliDb(env: DatabaseEnv): Promise<OpenedDb> {
  ensureFileDbDir(env.databaseUrl);
  return openDb(env);
}

/** Runs a CLI body that returns its one output line; any failure is printed and exits non-zero. */
export function runCli(main: () => Promise<string>): void {
  main().then(
    (line) => {
      console.log(line);
    },
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}

/** The file a reset may delete. Anything but a local `file:` database is refused: a reset must never touch a hosted one. */
export function resettableDbPath(databaseUrl: string): string {
  const file = fileDbPath(databaseUrl);
  if (file === null) {
    throw new Error(`db:reset only deletes a local file: database; refusing to reset ${new URL(databaseUrl).host}`);
  }
  return file;
}
