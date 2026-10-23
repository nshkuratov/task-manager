import { describe, expect, it } from "vitest";
import { PRIORITY_LABELS, STATUS_LABELS, TASK_PRIORITIES, TASK_STATUSES } from "./task";

describe("task constants", () => {
  it("R-DATA-2: statuses are exactly new, in_progress, done in that order", () => {
    expect(TASK_STATUSES).toEqual(["new", "in_progress", "done"]);
  });

  it("R-DATA-2: priorities are listed high first", () => {
    expect(TASK_PRIORITIES).toEqual(["high", "medium", "low"]);
  });

  it("R-DATA-2: every status and priority has a reader-facing label", () => {
    expect(TASK_STATUSES.map((status) => STATUS_LABELS[status])).toEqual(["New", "In progress", "Done"]);
    expect(TASK_PRIORITIES.map((priority) => PRIORITY_LABELS[priority])).toEqual(["High", "Medium", "Low"]);
  });
});
