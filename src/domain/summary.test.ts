import { describe, expect, it } from "vitest";
import type { TaskList } from "@/contracts/task";
import { summarizeList } from "./summary";
import { HOUR_MS, NOW, at, frozen, task } from "./test-fixtures";

const list: TaskList = { id: "list-1", name: "Home", createdAt: at(-240 * HOUR_MS), updatedAt: at(-HOUR_MS) };

describe("summarizeList", () => {
  it("R-LIST-2 R-LIST-3 R-LIST-4: an empty list summarises to zeros, 0 progress and no indicator", () => {
    const summary = summarizeList(list, [], NOW);
    expect(summary).toEqual({
      list,
      counters: { new: 0, inProgress: 0, done: 0, overdue: 0, total: 0 },
      progress: 0,
      indicator: "none",
    });
    expect(summary.list).toBe(list);
  });

  it("R-LIST-2 R-LIST-3 R-LIST-4: a mixed list summarises counters, progress and indicator together", () => {
    const tasks = frozen([
      task({ id: "1", status: "new", deadline: at(-HOUR_MS) }),
      task({ id: "2", status: "in_progress", deadline: at(HOUR_MS) }),
      task({ id: "3", status: "done", deadline: at(-HOUR_MS) }),
      task({ id: "4", status: "done" }),
    ]);
    expect(summarizeList(list, tasks, NOW)).toEqual({
      list,
      counters: { new: 1, inProgress: 1, done: 2, overdue: 1, total: 4 },
      progress: 0.5,
      indicator: "overdue",
    });
  });

  it("R-LIST-4: a list whose only open task is due soon is yellow", () => {
    const tasks = [task({ id: "1", deadline: at(HOUR_MS) }), task({ id: "2", status: "done" })];
    expect(summarizeList(list, tasks, NOW).indicator).toBe("due-soon");
  });
});
