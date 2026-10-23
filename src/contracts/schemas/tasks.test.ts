import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  changeTaskStatusSchema,
  createTaskSchema,
  deleteTaskSchema,
  taskFieldsSchema,
  updateTaskSchema,
} from "./tasks";

const valid = { title: "Write report", deadline: "" };

function fieldMessages(schema: z.ZodType, input: unknown, field: string): string[] {
  const issues = schema.safeParse(input).error?.issues ?? [];
  return issues.filter((issue) => issue.path[0] === field).map((issue) => issue.message);
}

describe("taskFieldsSchema", () => {
  it("R-DATA-2: applies the defaults for description, status and priority", () => {
    expect(taskFieldsSchema.parse(valid)).toEqual({
      title: "Write report",
      description: "",
      status: "new",
      priority: "medium",
      deadline: null,
    });
  });

  it("R-DATA-2: keeps an explicit status and priority", () => {
    const parsed = taskFieldsSchema.parse({ ...valid, status: "in_progress", priority: "high" });
    expect([parsed.status, parsed.priority]).toEqual(["in_progress", "high"]);
  });

  it("R-DATA-2: trims the title and the description", () => {
    const parsed = taskFieldsSchema.parse({ ...valid, title: "  Write report ", description: "  x  " });
    expect([parsed.title, parsed.description]).toEqual(["Write report", "x"]);
  });

  it.each([
    ["empty", ""],
    ["whitespace-only", "   "],
    ["missing", undefined],
  ])("R-DATA-2: rejects a %s title", (_label, title) => {
    expect(fieldMessages(taskFieldsSchema, { ...valid, title }, "title")).toEqual(["Title is required"]);
  });

  it("R-DATA-2: accepts a 120-character title and rejects 121", () => {
    expect(taskFieldsSchema.safeParse({ ...valid, title: "t".repeat(120) }).success).toBe(true);
    expect(fieldMessages(taskFieldsSchema, { ...valid, title: "t".repeat(121) }, "title")).toEqual([
      "Title must be 120 characters or fewer",
    ]);
  });

  it("R-DATA-2: accepts a 2000-character description and rejects 2001", () => {
    expect(taskFieldsSchema.safeParse({ ...valid, description: "d".repeat(2000) }).success).toBe(true);
    expect(fieldMessages(taskFieldsSchema, { ...valid, description: "d".repeat(2001) }, "description")).toEqual([
      "Description must be 2000 characters or fewer",
    ]);
  });

  it("R-DATA-2: rejects a status or priority outside the enum", () => {
    const input = { ...valid, status: "overdue", priority: "urgent" };
    expect(fieldMessages(taskFieldsSchema, input, "status")).toEqual(["Choose a valid status"]);
    expect(fieldMessages(taskFieldsSchema, input, "priority")).toEqual(["Choose a valid priority"]);
  });
});

describe("deadline", () => {
  const parseDeadline = (deadline: unknown) => taskFieldsSchema.safeParse({ ...valid, deadline });

  it('R-DATA-2: normalises "" and null to null', () => {
    expect(parseDeadline("").data?.deadline).toBeNull();
    expect(parseDeadline(null).data?.deadline).toBeNull();
  });

  it("R-DATA-2: turns an instant with an offset into the Date of the same instant", () => {
    const expected = new Date(Date.UTC(2026, 9, 22, 21, 59));
    expect(parseDeadline("2026-10-22T23:59:00+02:00").data?.deadline).toEqual(expected);
    expect(parseDeadline("2026-10-22T21:59:00Z").data?.deadline).toEqual(expected);
  });

  it.each([
    ["an instant without an offset", "2026-10-22T23:59:00"],
    ["a date only", "2026-10-22"],
    ["free text", "tomorrow"],
    ["a number", 1_761_170_340_000],
    ["a missing deadline", undefined],
  ])("R-DATA-2: rejects %s", (_label, deadline) => {
    expect(fieldMessages(taskFieldsSchema, { ...valid, deadline }, "deadline")).toEqual(["Enter a valid deadline"]);
  });
});

describe("task id schemas", () => {
  const id = crypto.randomUUID();
  const listId = crypto.randomUUID();

  it("R-DATA-2: create adds a uuid listId to the fields", () => {
    expect(createTaskSchema.parse({ ...valid, listId }).listId).toBe(listId);
    expect(fieldMessages(createTaskSchema, { ...valid, listId: "inbox" }, "listId")).toEqual([
      "This list could not be found",
    ]);
  });

  it("R-DATA-2: update adds a uuid id to the fields", () => {
    expect(updateTaskSchema.parse({ ...valid, id }).id).toBe(id);
    expect(fieldMessages(updateTaskSchema, valid, "id")).toEqual(["This task could not be found"]);
  });

  it("R-DATA-2: a status change requires a status instead of defaulting it", () => {
    expect(changeTaskStatusSchema.parse({ id, status: "done" })).toEqual({ id, status: "done" });
    expect(fieldMessages(changeTaskStatusSchema, { id }, "status")).toEqual(["Choose a valid status"]);
  });

  it("R-DATA-2: delete takes only a uuid id", () => {
    expect(deleteTaskSchema.parse({ id, title: "ignored" })).toEqual({ id });
    expect(fieldMessages(deleteTaskSchema, { id: "1" }, "id")).toEqual(["This task could not be found"]);
  });
});
