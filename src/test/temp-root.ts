import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    testTmpRoot: string;
  }
}

/**
 * One temp root per run for every test database. The teardown runs in the main process after the test
 * workers have exited, so it can delete files Windows still had locked inside a worker (see `removeTestDbDir`).
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const root = await mkdtemp(path.join(os.tmpdir(), "task-manager-tests-"));
  project.provide("testTmpRoot", root);
  return async () => {
    await rm(root, { recursive: true, force: true });
  };
}
