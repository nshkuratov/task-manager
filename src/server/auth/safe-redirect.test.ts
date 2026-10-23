import { describe, expect, it } from "vitest";
import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it.each([
    ["/lists?x=1#y", "/lists?x=1#y"],
    ["/lists", "/lists"],
    ["/lists/3f0c2a1e-1111-4a4a-8b8b-000000000000", "/lists/3f0c2a1e-1111-4a4a-8b8b-000000000000"],
    ["/tasks/abc?from=%2Flists", "/tasks/abc?from=%2Flists"],
    ["/loginx", "/loginx"],
  ])("keeps the same-origin path %j", (next, expected) => {
    expect(safeRedirect(next)).toBe(expected);
  });

  it.each([
    ["//evil.com"],
    ["https://evil.com"],
    ["/\\evil"],
    ["/a\\b"],
    ["/\t/evil.com"],
    ["/\n/evil.com"],
    ["/\r/evil.com"],
    ["javascript:alert(1)"],
    ["/.//evil.com"],
    ["/..//evil.com"],
    ["/%2e//evil.com"],
    ["/a/..//evil.com"],
    ["/login"],
    ["/login?next=%2Flists"],
    ["/login/"],
    ["/LOGIN"],
    ["lists"],
    [""],
  ])("refuses %j", (next) => {
    expect(safeRedirect(next)).toBeNull();
  });

  it.each([[undefined], [null], [42], [["/lists"]], [{ toString: () => "/lists" }]])(
    "refuses the non-string %j",
    (next) => {
      expect(safeRedirect(next)).toBeNull();
    },
  );
});
