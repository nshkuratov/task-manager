// eslint-disable-next-line no-restricted-imports -- the contracts import allowlist (eslint.config.mjs) also covers tests; vitest is test-only
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { createListSchema, deleteListSchema, listNameSchema, renameListSchema } from "./lists";

function messages(schema: z.ZodType, input: unknown): string[] {
  return schema.safeParse(input).error?.issues.map((issue) => issue.message) ?? [];
}

describe("list schemas", () => {
  it("R-DATA-2: trims the list name", () => {
    expect(createListSchema.parse({ name: "  Groceries  " })).toEqual({ name: "Groceries" });
  });

  it.each([
    ["empty", ""],
    ["whitespace-only", " \t\n "],
    ["missing", undefined],
    ["non-string", 7],
  ])("R-DATA-2: rejects a %s name", (_label, name) => {
    expect(messages(createListSchema, { name })).toEqual(["Name is required"]);
  });

  it("R-DATA-2: accepts 80 characters after trimming and rejects 81", () => {
    expect(listNameSchema.parse(` ${"n".repeat(80)} `)).toHaveLength(80);
    expect(messages(listNameSchema, "n".repeat(81))).toEqual(["Name must be 80 characters or fewer"]);
  });

  it("R-DATA-2: rename takes a uuid id and a valid name", () => {
    const id = crypto.randomUUID();
    expect(renameListSchema.parse({ id, name: " Work " })).toEqual({ id, name: "Work" });
    expect(messages(renameListSchema, { id: "list-1", name: "Work" })).toEqual(["This list could not be found"]);
  });

  it("R-DATA-2: delete rejects a missing or malformed id", () => {
    const id = crypto.randomUUID();
    expect(deleteListSchema.parse({ id })).toEqual({ id });
    expect(messages(deleteListSchema, {})).toEqual(["This list could not be found"]);
    expect(messages(deleteListSchema, { id: `${id}x` })).toEqual(["This list could not be found"]);
  });
});
