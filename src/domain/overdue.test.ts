import { describe, expect, it } from "vitest";
import { DUE_SOON_WINDOW_MS, isDueSoon, isOverdue } from "./overdue";
import { HOUR_MS, NOW, at, task } from "./test-fixtures";

describe("isOverdue", () => {
  it("R-LIST-4: a deadline 1 ms before now is overdue", () => {
    expect(isOverdue(task({ id: "a", deadline: at(-1) }), NOW)).toBe(true);
  });

  it("R-LIST-4: a deadline exactly at now is not overdue (strict)", () => {
    expect(isOverdue(task({ id: "a", deadline: NOW }), NOW)).toBe(false);
  });

  it("R-LIST-4: a done task with a past deadline is not overdue", () => {
    expect(isOverdue(task({ id: "a", status: "done", deadline: at(-HOUR_MS) }), NOW)).toBe(false);
  });

  it("R-LIST-4: an in-progress task with a past deadline is overdue", () => {
    expect(isOverdue(task({ id: "a", status: "in_progress", deadline: at(-HOUR_MS) }), NOW)).toBe(true);
  });

  it("R-LIST-4: an undated task is never overdue", () => {
    expect(isOverdue(task({ id: "a", deadline: null }), NOW)).toBe(false);
  });
});

describe("isDueSoon", () => {
  it("R-LIST-4: the window is 48 hours", () => {
    expect(DUE_SOON_WINDOW_MS).toBe(48 * HOUR_MS);
  });

  it("R-LIST-4: a deadline exactly at now is due soon (inclusive start)", () => {
    expect(isDueSoon(task({ id: "a", deadline: NOW }), NOW)).toBe(true);
  });

  it("R-LIST-4: a deadline exactly now + 48 h is due soon (inclusive end)", () => {
    expect(isDueSoon(task({ id: "a", deadline: at(48 * HOUR_MS) }), NOW)).toBe(true);
  });

  it("R-LIST-4: a deadline at now + 48 h + 1 ms is not due soon", () => {
    expect(isDueSoon(task({ id: "a", deadline: at(48 * HOUR_MS + 1) }), NOW)).toBe(false);
  });

  it("R-LIST-4: an overdue deadline (now − 1 ms) is not due soon", () => {
    expect(isDueSoon(task({ id: "a", deadline: at(-1) }), NOW)).toBe(false);
  });

  it("R-LIST-4: a done task inside the window is not due soon", () => {
    expect(isDueSoon(task({ id: "a", status: "done", deadline: at(HOUR_MS) }), NOW)).toBe(false);
  });

  it("R-LIST-4: an undated task is never due soon", () => {
    expect(isDueSoon(task({ id: "a", deadline: null }), NOW)).toBe(false);
  });
});
