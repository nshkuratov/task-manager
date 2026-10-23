// eslint-disable-next-line no-restricted-imports -- the contracts import allowlist (eslint.config.mjs) also covers tests; vitest is test-only
import { describe, expect, it } from "vitest";
import { listsSearchParamsSchema, tasksSearchParamsSchema } from "./search-params";

const junk: unknown[] = [undefined, null, 42, "q=1", [], { q: 5 }, { q: [1, 2] }, { status: { new: true } }];

describe("listsSearchParamsSchema", () => {
  const parse = (input: unknown) => listsSearchParamsSchema.safeParse(input);

  it.each(junk)("R-DATA-2: never fails, and treats junk %j as no query", (input) => {
    expect(parse(input)).toEqual({ success: true, data: {} });
  });

  it("R-DATA-2: trims a single string", () => {
    expect(parse({ q: "  groceries " }).data).toEqual({ q: "groceries" });
  });

  it("R-DATA-2: takes the first value of an array", () => {
    expect(parse({ q: ["work", "home"] }).data).toEqual({ q: "work" });
  });

  it("R-DATA-2: omits the key for a blank query", () => {
    expect(parse({ q: "   " }).data).toStrictEqual({});
    expect(parse({ q: [] }).data).toStrictEqual({});
  });

  it("R-DATA-2: truncates a 101-character query to 100 instead of rejecting it", () => {
    expect(parse({ q: "a".repeat(101) }).data).toEqual({ q: "a".repeat(100) });
  });

  it("R-DATA-2: truncates by code point, never splitting a surrogate pair", () => {
    expect(parse({ q: "😀".repeat(101) }).data).toEqual({ q: "😀".repeat(100) });
  });

  it("R-DATA-2: ignores unrelated params", () => {
    expect(parse({ q: "x", status: "done" }).data).toEqual({ q: "x" });
  });
});

describe("tasksSearchParamsSchema", () => {
  const parse = (input: unknown) => tasksSearchParamsSchema.safeParse(input);

  it.each(junk)("R-DATA-2: never fails, and treats junk %j as no filter", (input) => {
    expect(parse(input)).toEqual({ success: true, data: {} });
  });

  it("R-DATA-2: parses a single status", () => {
    expect(parse({ status: "done" }).data).toEqual({ status: ["done"] });
  });

  it("R-DATA-2: parses a comma list into TASK_STATUSES order", () => {
    expect(parse({ status: "done, new" }).data).toEqual({ status: ["new", "done"] });
  });

  it("R-DATA-2: parses the array form, including comma lists inside it", () => {
    expect(parse({ status: ["done", "in_progress,new"] }).data).toEqual({ status: ["new", "in_progress", "done"] });
  });

  it("R-DATA-2: drops unknown values and duplicates", () => {
    expect(parse({ status: "done,bogus,done,New,,done" }).data).toEqual({ status: ["done"] });
  });

  it("R-DATA-2: omits the key when nothing valid is left", () => {
    expect(parse({ status: "bogus" }).data).toStrictEqual({});
    expect(parse({ status: "" }).data).toStrictEqual({});
  });
});
