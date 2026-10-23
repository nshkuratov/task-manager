import "server-only";
import { runMigrations } from "../migrate";
import { loadCliEnv, openCliDb, runCli } from "./shared";

runCli(async () => {
  const { db, client } = await openCliDb(loadCliEnv());
  try {
    return `migrated: ${await runMigrations(db)} applied`;
  } finally {
    client.close();
  }
});
