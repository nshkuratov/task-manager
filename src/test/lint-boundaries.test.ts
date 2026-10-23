import path from "node:path";
import { pathToFileURL } from "node:url";
import { ESLint, type Linter } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const FIXTURE_ROOT = path.join(import.meta.dirname, "fixtures/boundaries");

const RESTRICTED_IMPORTS = "no-restricted-imports";
const RESTRICTED_PATHS = "import/no-restricted-paths";
const RESTRICTED_SYNTAX = "no-restricted-syntax";

type BoundaryRule = typeof RESTRICTED_IMPORTS | typeof RESTRICTED_PATHS | typeof RESTRICTED_SYNTAX;
type CreateConfig = (options: { root: string; typeAware: boolean }) => Linter.Config[];

interface Case {
  file: string;
  code: string;
  rules: BoundaryRule[];
}

const violations: Case[] = [
  {
    file: "src/components/x.tsx",
    code: 'import { db } from "@/server/db/client";',
    rules: [RESTRICTED_IMPORTS, RESTRICTED_PATHS],
  },
  { file: "src/components/x.tsx", code: 'import "server-only";', rules: [RESTRICTED_IMPORTS] },
  { file: "src/components/x.stories.tsx", code: 'import { sql } from "drizzle-orm";', rules: [RESTRICTED_IMPORTS] },
  { file: "src/domain/x.ts", code: 'import { useState } from "react";', rules: [RESTRICTED_IMPORTS] },
  {
    file: "src/domain/x.ts",
    code: 'import { db } from "@/server/db/client";',
    rules: [RESTRICTED_IMPORTS, RESTRICTED_PATHS],
  },
  { file: "src/domain/x.ts", code: 'import type { TaskStatus } from "@/contracts";', rules: [RESTRICTED_IMPORTS] },
  { file: "src/domain/x.ts", code: "export const t = Date.now();", rules: [RESTRICTED_SYNTAX] },
  { file: "src/domain/x.ts", code: "export const t = new Date();", rules: [RESTRICTED_SYNTAX] },
  { file: "src/contracts/x.ts", code: 'import { useState } from "react";', rules: [RESTRICTED_IMPORTS] },
  { file: "src/contracts/x.ts", code: 'import { it } from "vitest";', rules: [RESTRICTED_IMPORTS] },
  { file: "src/contracts/x.test.ts", code: 'import { useState } from "react";', rules: [RESTRICTED_IMPORTS] },
  {
    file: "src/contracts/x.test.ts",
    code: 'import { defineConfig } from "vitest/config";',
    rules: [RESTRICTED_IMPORTS],
  },
  {
    file: "src/contracts/x.test.ts",
    code: 'import { db } from "@/server/db/client";',
    rules: [RESTRICTED_IMPORTS, RESTRICTED_PATHS],
  },
  { file: "src/app/x/page.tsx", code: 'import { sql } from "drizzle-orm";', rules: [RESTRICTED_IMPORTS] },
  {
    file: "src/app/x/page.tsx",
    code: 'import { db } from "@/server/db/client";',
    rules: [RESTRICTED_IMPORTS, RESTRICTED_PATHS],
  },
  { file: "src/app/x/page.tsx", code: 'import { db } from "../../server/db/client";', rules: [RESTRICTED_PATHS] },
  {
    file: "src/server/actions/x.ts",
    code: 'import { createClient } from "@libsql/client";',
    rules: [RESTRICTED_IMPORTS],
  },
  { file: "src/server/actions/x.ts", code: 'import { db } from "../db/client";', rules: [RESTRICTED_PATHS] },
  {
    file: "src/server/actions/x.ts",
    code: 'import { createTestDb } from "@/server/db/testing";',
    rules: [RESTRICTED_IMPORTS, RESTRICTED_PATHS],
  },
  { file: "src/proxy.ts", code: 'import { db } from "./server/db/client";', rules: [RESTRICTED_PATHS] },
  {
    file: "src/components/area/x.tsx",
    code: 'import { getRepositories } from "../../server/repositories";',
    rules: [RESTRICTED_PATHS],
  },
  {
    file: "src/components/area/x.tsx",
    code: 'import { createTestDb } from "../../server/db/testing";',
    rules: [RESTRICTED_PATHS],
  },
  {
    file: "src/server/actions/x.test.ts",
    code: 'import { db } from "@/server/db/client";',
    rules: [RESTRICTED_IMPORTS, RESTRICTED_PATHS],
  },
  { file: "src/server/actions/x.test.ts", code: 'import { db } from "../db/client";', rules: [RESTRICTED_PATHS] },
  { file: "src/server/actions/x.test.ts", code: 'import { sql } from "drizzle-orm";', rules: [RESTRICTED_IMPORTS] },
  {
    file: "src/server/actions/x.test.ts",
    code: 'import { createTestDb } from "@/server/db/testing-extra";',
    rules: [RESTRICTED_IMPORTS, RESTRICTED_PATHS],
  },
];

const allowed: Case[] = [
  { file: "src/domain/x.ts", code: "export const at = (iso: string) => new Date(iso);", rules: [] },
  {
    file: "src/domain/x.ts",
    code: 'import type { TaskStatus } from "@/contracts/task";\nexport type S = TaskStatus;',
    rules: [],
  },
  { file: "src/server/actions/x.test.ts", code: 'import { createTestDb } from "@/server/db/testing";', rules: [] },
  { file: "src/server/actions/x.test.ts", code: 'import { createTestDb } from "../db/testing";', rules: [] },
  { file: "src/app/x/page.tsx", code: 'import { getRepositories } from "@/server/repositories";', rules: [] },
  { file: "src/app/x/page.tsx", code: 'import { getSession } from "@/server/auth/session";', rules: [] },
  { file: "src/contracts/x.test.ts", code: 'import { it } from "vitest";', rules: [] },
];

const BOUNDARY_RULES: ReadonlySet<string> = new Set([RESTRICTED_IMPORTS, RESTRICTED_PATHS, RESTRICTED_SYNTAX]);

let eslint: ESLint;

beforeAll(async () => {
  const configModule: unknown = await import(pathToFileURL(path.join(REPO_ROOT, "eslint.config.mjs")).href);
  if (
    typeof configModule !== "object" ||
    configModule === null ||
    !("createConfig" in configModule) ||
    typeof configModule.createConfig !== "function"
  ) {
    throw new Error("eslint.config.mjs must export a createConfig function");
  }
  const createConfig = configModule.createConfig as CreateConfig;
  eslint = new ESLint({
    cwd: FIXTURE_ROOT,
    ignore: false,
    overrideConfigFile: true,
    overrideConfig: [
      ...createConfig({ root: FIXTURE_ROOT, typeAware: false }),
      // An import the resolver cannot find is skipped by import/no-restricted-paths, so every case must resolve.
      { rules: { "import/no-unresolved": "error", "@next/next/no-html-link-for-pages": "off" } },
    ],
  });
});

async function lint({ file, code }: Case) {
  const [result] = await eslint.lintText(`${code}\n`, { filePath: path.join(FIXTURE_ROOT, file) });
  if (!result) throw new Error(`no lint result for ${file}`);
  const fatal = result.messages.filter((message) => message.fatal === true || message.ruleId === null);
  const unresolved = result.messages.filter((message) => message.ruleId === "import/no-unresolved");
  const boundary = [
    ...new Set(
      result.messages.flatMap(({ ruleId }) => (ruleId !== null && BOUNDARY_RULES.has(ruleId) ? [ruleId] : [])),
    ),
  ];
  return { fatal, unresolved, boundary: boundary.sort() };
}

const label = ({ file, code }: Case) => `${file}: ${code.split("\n")[0]}`;

describe("R-DATA-1, R-DATA-2, R-DATA-3: lint-enforced import boundaries", { timeout: 60_000 }, () => {
  it.each(violations.map((c) => [label(c), c] as const))("flags %s", async (_, testCase) => {
    const { fatal, unresolved, boundary } = await lint(testCase);
    expect(fatal).toEqual([]);
    expect(unresolved).toEqual([]);
    expect(boundary).toEqual([...testCase.rules].sort());
  });

  it.each(allowed.map((c) => [label(c), c] as const))("allows %s", async (_, testCase) => {
    const { fatal, unresolved, boundary } = await lint(testCase);
    expect(fatal).toEqual([]);
    expect(unresolved).toEqual([]);
    expect(boundary).toEqual([]);
  });
});
