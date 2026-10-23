import { describe, expect, it } from "vitest";
import { buildDemoData, type DemoTask } from "@/server/db/seed-data";

const NOW = new Date("2026-10-22T12:00:00Z");
const WINDOW_MS = 48 * 60 * 60 * 1000;

const open = (task: DemoTask) => task.status !== "done";
const overdue = (task: DemoTask) => open(task) && task.deadline !== null && task.deadline < NOW;
const dueSoon = (task: DemoTask) =>
  open(task) &&
  task.deadline !== null &&
  task.deadline.getTime() >= NOW.getTime() &&
  task.deadline.getTime() <= NOW.getTime() + WINDOW_MS;

describe("buildDemoData", () => {
  const demo = buildDemoData(NOW);
  const byName = new Map(demo.map((list) => [list.name, list]));
  const tasksOf = (name: string) => byName.get(name)?.tasks ?? [];

  it("has the four demo lists, newest first", () => {
    expect(demo.map((list) => list.name)).toEqual(["Product launch", "Home renovation", "Reading list", "Someday"]);
    const created = demo.map((list) => list.createdAt.getTime());
    expect(created).toEqual([...created].sort((a, b) => b - a));
  });

  it("R-LIST-4: shows a red list (an unfinished overdue task)", () => {
    expect(tasksOf("Product launch").some(overdue)).toBe(true);
    expect(new Set(tasksOf("Product launch").map((task) => task.status))).toEqual(
      new Set(["new", "in_progress", "done"]),
    );
  });

  it("R-LIST-4: shows a yellow list (due within 48 h, nothing overdue)", () => {
    expect(tasksOf("Home renovation").some(dueSoon)).toBe(true);
    expect(tasksOf("Home renovation").some(overdue)).toBe(false);
  });

  it("shows an all-done list and an empty list", () => {
    const reading = tasksOf("Reading list");
    expect(reading.length).toBeGreaterThan(0);
    expect(reading.every((task) => task.status === "done")).toBe(true);
    expect(tasksOf("Someday")).toEqual([]);
  });

  it("has about 15 tasks with varied priorities, some undated", () => {
    const all = demo.flatMap((list) => list.tasks);
    expect(all.length).toBeGreaterThanOrEqual(13);
    expect(all.length).toBeLessThanOrEqual(17);
    expect(new Set(all.map((task) => task.priority))).toEqual(new Set(["high", "medium", "low"]));
    expect(all.some((task) => task.deadline === null)).toBe(true);
  });

  it("moves every deadline with the clock", () => {
    const later = new Date(NOW.getTime() + 1000);
    const shifted = buildDemoData(later).flatMap((list) => list.tasks);
    const original = demo.flatMap((list) => list.tasks);
    shifted.forEach((task, index) => {
      const before = original[index]?.deadline ?? null;
      expect(task.deadline?.getTime() ?? null).toBe(before === null ? null : before.getTime() + 1000);
    });
  });
});
