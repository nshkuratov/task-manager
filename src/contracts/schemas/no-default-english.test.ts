// eslint-disable-next-line no-restricted-imports -- the contracts import allowlist (eslint.config.mjs) also covers tests; vitest is test-only
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { loginSchema } from "./auth";
import { createListSchema, deleteListSchema, renameListSchema } from "./lists";
import { changeTaskStatusSchema, createTaskSchema, deleteTaskSchema, updateTaskSchema } from "./tasks";

const FIELDS = ["email", "password", "name", "id", "listId", "title", "description", "status", "priority", "deadline"];
const allFields = (value: unknown) => Object.fromEntries(FIELDS.map((field) => [field, value]));

const badInputs: unknown[] = [undefined, null, "text", 42, [], {}, allFields(1), allFields("x".repeat(2001))];

const schemas: [string, z.ZodType][] = [
  ["loginSchema", loginSchema],
  ["createListSchema", createListSchema],
  ["renameListSchema", renameListSchema],
  ["deleteListSchema", deleteListSchema],
  ["createTaskSchema", createTaskSchema],
  ["updateTaskSchema", updateTaskSchema],
  ["changeTaskStatusSchema", changeTaskStatusSchema],
  ["deleteTaskSchema", deleteTaskSchema],
];

describe("reader-facing messages", () => {
  it.each(schemas)("R-DATA-2: %s never reports zod's default English", (_name, schema) => {
    const messages = badInputs.flatMap((input) => schema.safeParse(input).error?.issues.map((i) => i.message) ?? []);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.filter((message) => /^(Invalid\b|Too (big|small))|expected /.test(message))).toEqual([]);
  });
});
