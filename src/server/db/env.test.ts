import { describe, expect, it } from "vitest";
import { parseDbEnv } from "@/server/db/env";

describe("parseDbEnv", () => {
  it("refuses a file: database on Vercel, where writes would be lost", () => {
    expect(() => parseDbEnv({ VERCEL: "1", DATABASE_URL: "file:./data/app.db" })).toThrow(/would lose writes/);
  });

  it("requires an auth token for a libsql:// URL", () => {
    expect(() => parseDbEnv({ DATABASE_URL: "libsql://app-org.turso.io" })).toThrow(/DATABASE_AUTH_TOKEN/);
  });

  it("needs no SESSION_SECRET, even in production", () => {
    expect(parseDbEnv({ NODE_ENV: "production", DATABASE_URL: "file:./data/app.db" })).toEqual({
      databaseUrl: "file:./data/app.db",
      databaseAuthToken: undefined,
    });
  });

  it("accepts a hosted database with its token on Vercel", () => {
    expect(parseDbEnv({ VERCEL: "1", DATABASE_URL: "libsql://app-org.turso.io", DATABASE_AUTH_TOKEN: "t" })).toEqual({
      databaseUrl: "libsql://app-org.turso.io",
      databaseAuthToken: "t",
    });
  });
});
