import { describe, expect, it } from "vitest";
import { percentDone, progressText } from "./list-progress";

describe("percentDone", () => {
  it.each([
    [{ done: 2, total: 5 }, 40],
    [{ done: 2, total: 3 }, 66],
    [{ done: 5, total: 5 }, 100],
    [{ done: 99, total: 100 }, 99],
  ])("floors %j to %i", (counts, expected) => {
    expect(percentDone(counts)).toBe(expected);
  });

  it.each([
    [29, 50, 58],
    [29, 100, 29],
    [57, 100, 57],
    [58, 100, 58],
  ])("is exact where the float ratio is not: %i of %i is %i%%", (done, total, expected) => {
    expect(Math.floor((done / total) * 100)).toBe(expected - 1);
    expect(percentDone({ done, total })).toBe(expected);
  });

  it("is 0 for a list with no tasks, never NaN", () => {
    expect(percentDone({ done: 0, total: 0 })).toBe(0);
  });
});

describe("progressText", () => {
  it("reads N% done (d of t)", () => {
    expect(progressText({ done: 2, total: 5 })).toBe("40% done (2 of 5)");
    expect(progressText({ done: 0, total: 0 })).toBe("0% done (0 of 0)");
  });
});
