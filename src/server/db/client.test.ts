import path from "node:path";
import { describe, expect, it } from "vitest";
import { fileDbPath } from "@/server/db/client";
import { resettableDbPath } from "@/server/db/cli/shared";

describe("fileDbPath", () => {
  it.each([
    ["file:./data/app.db", path.resolve("data/app.db")],
    ["file:data/app.db", path.resolve("data/app.db")],
    ["file:/tmp/app.db", "/tmp/app.db"],
    ["file:///tmp/app.db", "/tmp/app.db"],
    ["file:./data/app.db?mode=ro", path.resolve("data/app.db")],
  ])("maps %s to a filesystem path", (url, expected) => {
    expect(fileDbPath(url)).toBe(expected);
  });

  it.each([["libsql://app-org.turso.io"], ["https://app-org.turso.io"]])("returns null for remote %s", (url) => {
    expect(fileDbPath(url)).toBeNull();
  });
});

describe("resettableDbPath", () => {
  it("allows a local file database", () => {
    expect(resettableDbPath("file:./data/app.db")).toBe(path.resolve("data/app.db"));
  });

  it("refuses a hosted database, naming its host", () => {
    expect(() => resettableDbPath("libsql://app-org.turso.io")).toThrow(/refusing to reset app-org\.turso\.io/);
  });
});
