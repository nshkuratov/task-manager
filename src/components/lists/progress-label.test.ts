import { describe, expect, it } from "vitest";
import { percentDone, progressLabel } from "./progress-label";

describe("progressLabel", () => {
  it("R-LIST-3: reads as whole percent with the counts", () => {
    expect(progressLabel({ done: 2, total: 5 })).toBe("40% done (2 of 5)");
    expect(progressLabel({ done: 1, total: 3 })).toBe("33% done (1 of 3)");
  });

  it("R-LIST-3: an empty list is 0%, never NaN", () => {
    expect(progressLabel({ done: 0, total: 0 })).toBe("0% done (0 of 0)");
  });

  it("R-LIST-3: floors, so 100% means every task is done", () => {
    expect(percentDone({ done: 199, total: 200 })).toBe(99);
    expect(percentDone({ done: 4, total: 4 })).toBe(100);
  });

  it("R-LIST-3: does not lose a percent to floating point", () => {
    for (let done = 0; done <= 100; done += 1) expect(percentDone({ done, total: 100 })).toBe(done);
  });
});
