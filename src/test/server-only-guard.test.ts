import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const SERVER_DIR = path.resolve(import.meta.dirname, "../server");
const EXEMPT = [
  "**/*.test.ts",
  // drizzle-kit loads the schema under default Node conditions, where `server-only` throws.
  "db/schema.ts",
  "db/cli/**",
];

/** True when the module opens with `import "server-only"`, or with `"use server"` immediately followed by it. */
export function startsWithServerOnly(source: string, fileName = "module.ts"): boolean {
  const { statements } = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, false);
  const isServerOnlyImport = (node: ts.Statement | undefined) =>
    node !== undefined &&
    ts.isImportDeclaration(node) &&
    node.importClause === undefined &&
    ts.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text === "server-only";
  const isUseServer = (node: ts.Statement | undefined) =>
    node !== undefined &&
    ts.isExpressionStatement(node) &&
    ts.isStringLiteral(node.expression) &&
    node.expression.text === "use server";

  return isUseServer(statements[0]) ? isServerOnlyImport(statements[1]) : isServerOnlyImport(statements[0]);
}

describe("startsWithServerOnly", () => {
  it.each([
    ['import "server-only";\nexport const x = 1;'],
    ["// why this module exists\nimport 'server-only';\nexport {};"],
    ['"use server";\nimport "server-only";\nexport async function act() {}'],
  ])("accepts %j", (source) => {
    expect(startsWithServerOnly(source)).toBe(true);
  });

  it.each([
    ["export const x = 1;"],
    ['import { z } from "zod";\nimport "server-only";'],
    ['"use server";\nexport async function act() {}'],
    ['"use server";\nimport { z } from "zod";\nimport "server-only";'],
    ['import x from "server-only";'],
    [""],
  ])("rejects %j", (source) => {
    expect(startsWithServerOnly(source)).toBe(false);
  });
});

describe('every server module starts with import "server-only"', async () => {
  const files = await Array.fromAsync(glob("**/*.{ts,tsx}", { cwd: SERVER_DIR, exclude: EXEMPT }));

  it("finds the server modules to check", () => {
    expect(files).toContain("env.ts");
  });

  it.each(files.map((file) => [file]))("src/server/%s", (file) => {
    expect(startsWithServerOnly(readFileSync(path.join(SERVER_DIR, file), "utf8"), file)).toBe(true);
  });
});
