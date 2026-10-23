import "server-only";
import { rm } from "node:fs/promises";
import { runMigrations } from "../migrate";
import { formatSeedResult, seed } from "../seed";
import { loadCliEnv, openCliDb, resettableDbPath, runCli } from "./shared";

runCli(async () => {
  const env = loadCliEnv();
  const file = resettableDbPath(env.databaseUrl);
  await Promise.all(["", "-wal", "-shm", "-journal"].map((suffix) => rm(`${file}${suffix}`, { force: true })));

  const { db, client } = await openCliDb(env);
  try {
    const applied = await runMigrations(db);
    const seeded = formatSeedResult(await seed(db));
    return `reset: ${file} recreated; migrated: ${applied} applied; ${seeded}`;
  } finally {
    client.close();
  }
});
