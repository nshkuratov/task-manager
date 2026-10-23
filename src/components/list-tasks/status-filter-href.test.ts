import { describe, expect, it } from "vitest";
import { tasksSearchParamsSchema, type TaskStatus } from "@/contracts";
import { statusFilterHref } from "./status-filter-href";

const PATH = "/lists/8d1f2a4e-5b6c-4d7e-8f90-a1b2c3d4e5f6";

const parsedStatuses = (href: string) => {
  const params = Object.fromEntries(new URL(href, "http://sentinel.invalid").searchParams);
  return tasksSearchParamsSchema.parse(params).status;
};

describe("statusFilterHref", () => {
  it("R-TASKS-6: writes the selection in status order, comma-joined", () => {
    expect(statusFilterHref(PATH, ["done", "new"])).toBe(`${PATH}?status=new,done`);
  });

  it("drops the query entirely when nothing is selected", () => {
    expect(statusFilterHref(PATH, [])).toBe(PATH);
  });

  it("does not repeat a status listed twice", () => {
    expect(statusFilterHref(PATH, ["in_progress", "in_progress"])).toBe(`${PATH}?status=in_progress`);
  });

  it.each<TaskStatus[]>([
    [],
    ["new"],
    ["in_progress"],
    ["done"],
    ["new", "in_progress"],
    ["new", "in_progress", "done"],
  ])("round-trips %j through the page's search-param schema", (...statuses) => {
    const expected = statuses.length === 0 ? undefined : statuses;
    expect(parsedStatuses(statusFilterHref(PATH, statuses))).toEqual(expected);
  });
});
