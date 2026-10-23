import { describe, expect, it } from "vitest";
import { percentDone, progressText } from "./progress-text";

describe("percentDone", () => {
  it.each([
    [{ done: 2, total: 5 }, 40],
    [{ done: 4, total: 5 }, 80],
    [{ done: 2, total: 3 }, 66],
    [{ done: 199, total: 200 }, 99],
    [{ done: 99, total: 100 }, 99],
    [{ done: 4, total: 4 }, 100],
    [{ done: 5, total: 5 }, 100],
  ])("R-LIST-3: floors %j to %i, so 100% means every task is done", (counts, expected) => {
    expect(percentDone(counts)).toBe(expected);
  });

  it.each([
    [29, 50, 58],
    [29, 100, 29],
    [57, 100, 57],
    [58, 100, 58],
  ])("R-LIST-3: is exact where the float ratio is not: %i of %i is %i%%", (done, total, expected) => {
    expect(Math.floor((done / total) * 100)).toBe(expected - 1);
    expect(percentDone({ done, total })).toBe(expected);
  });

  it("R-LIST-3: does not lose a percent to floating point anywhere in 0..100 of 100", () => {
    for (let done = 0; done <= 100; done += 1) expect(percentDone({ done, total: 100 })).toBe(done);
  });

  it("R-LIST-3: an empty list is 0%, never NaN", () => {
    expect(percentDone({ done: 0, total: 0 })).toBe(0);
  });
});

describe("progressText", () => {
  it("R-LIST-3: reads N% done (d of t)", () => {
    expect(progressText({ done: 2, total: 5 })).toBe("40% done (2 of 5)");
    expect(progressText({ done: 1, total: 3 })).toBe("33% done (1 of 3)");
  });

  it("R-LIST-3: an empty list reads 0% done (0 of 0)", () => {
    expect(progressText({ done: 0, total: 0 })).toBe("0% done (0 of 0)");
  });
});
