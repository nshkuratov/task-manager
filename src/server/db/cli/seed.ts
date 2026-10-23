import "server-only";
import { formatSeedResult, seed } from "../seed";
import { loadCliEnv, openCliDb, runCli } from "./shared";

runCli(async () => {
  const { db, client } = await openCliDb(loadCliEnv());
  try {
    return formatSeedResult(await seed(db));
  } finally {
    client.close();
  }
});
