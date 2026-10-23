import { describe, expect, it } from "vitest";
import { filterByStatus } from "./filter";
import { frozen, task } from "./test-fixtures";

const tasks = frozen([
  task({ id: "1", status: "done" }),
  task({ id: "2", status: "new" }),
  task({ id: "3", status: "in_progress" }),
  task({ id: "4", status: "new" }),
]);

describe("filterByStatus", () => {
  it("R-TASKS-6: an empty selection returns every task as a new array", () => {
    const result = filterByStatus(tasks, []);
    expect(result).not.toBe(tasks);
    expect(result).toEqual(tasks);
  });

  it("R-TASKS-6: a single status keeps only matching tasks", () => {
    expect(filterByStatus(tasks, ["new"]).map((t) => t.id)).toEqual(["2", "4"]);
  });

  it("R-TASKS-6: a multi-status selection keeps the input order", () => {
    expect(filterByStatus(tasks, ["new", "done"]).map((t) => t.id)).toEqual(["1", "2", "4"]);
  });

  it("R-TASKS-6: a status with no tasks yields an empty result", () => {
    expect(filterByStatus(frozen([task({ id: "1", status: "new" })]), ["done"])).toEqual([]);
  });
});
