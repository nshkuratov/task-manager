import { describe, expect, it } from "vitest";
import { DEFAULT_DATABASE_URL, EnvError, parseDatabaseEnv, parseEnv } from "@/server/env";

const SECRET = "s".repeat(32);

describe("parseEnv", () => {
  it("applies the dev defaults when nothing is set", () => {
    const env = parseEnv({});
    expect(env.databaseUrl).toBe(DEFAULT_DATABASE_URL);
    expect(env.databaseAuthToken).toBeUndefined();
    expect(env.sessionSecret.length).toBeGreaterThanOrEqual(32);
  });

  it("accepts a production Turso configuration on Vercel", () => {
    const env = parseEnv({
      NODE_ENV: "production",
      VERCEL: "1",
      DATABASE_URL: "libsql://app-org.turso.io",
      DATABASE_AUTH_TOKEN: "token",
      SESSION_SECRET: SECRET,
    });
    expect(env).toEqual({
      databaseUrl: "libsql://app-org.turso.io",
      databaseAuthToken: "token",
      sessionSecret: SECRET,
    });
  });

  it("accepts a local file database for a production build off Vercel (next start, e2e)", () => {
    expect(parseEnv({ NODE_ENV: "production", SESSION_SECRET: SECRET }).databaseUrl).toBe(DEFAULT_DATABASE_URL);
  });

  it("requires SESSION_SECRET in production", () => {
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrow(/SESSION_SECRET is required when NODE_ENV=production/);
  });

  it("rejects a session secret shorter than 32 characters in any environment", () => {
    expect(() => parseEnv({ SESSION_SECRET: "s".repeat(31) })).toThrow(/SESSION_SECRET must be at least 32/);
    expect(() => parseEnv({ NODE_ENV: "production", SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
  });

  it("treats empty values as unset, so a copied .env.example works", () => {
    const env = parseEnv({ DATABASE_URL: "", DATABASE_AUTH_TOKEN: "", SESSION_SECRET: "" });
    expect(env.databaseUrl).toBe(DEFAULT_DATABASE_URL);
    expect(env.databaseAuthToken).toBeUndefined();
    expect(() => parseEnv({ NODE_ENV: "production", SESSION_SECRET: "" })).toThrow(/SESSION_SECRET is required/);
  });

  it("refuses a file: database on Vercel because writes would be lost", () => {
    expect(() => parseEnv({ VERCEL: "1", DATABASE_URL: "file:./x.db", SESSION_SECRET: SECRET })).toThrow(
      /DATABASE_URL a file: database on Vercel would lose writes/,
    );
    expect(() => parseEnv({ VERCEL: "1", SESSION_SECRET: SECRET })).toThrow(/would lose writes/);
  });

  it("requires DATABASE_AUTH_TOKEN for a libsql:// URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "libsql://app-org.turso.io" })).toThrow(
      /DATABASE_AUTH_TOKEN is required when DATABASE_URL is a libsql:\/\/ URL/,
    );
  });

  it("rejects an unknown URL scheme", () => {
    expect(() => parseEnv({ DATABASE_URL: "postgres://db" })).toThrow(/DATABASE_URL must start with/);
  });

  it("reports every invalid variable in one EnvError", () => {
    const parse = () => parseEnv({ NODE_ENV: "production", DATABASE_URL: "libsql://db" });
    expect(parse).toThrow(EnvError);
    expect(parse).toThrow(/DATABASE_AUTH_TOKEN[\s\S]*SESSION_SECRET/);
  });
});

describe("parseDatabaseEnv", () => {
  it("validates the database variables without needing a session secret", () => {
    expect(parseDatabaseEnv({ NODE_ENV: "production" }).databaseUrl).toBe(DEFAULT_DATABASE_URL);
    expect(() => parseDatabaseEnv({ VERCEL: "1" })).toThrow(/would lose writes/);
    expect(() => parseDatabaseEnv({ DATABASE_URL: "libsql://db" })).toThrow(/DATABASE_AUTH_TOKEN/);
  });
});

describe("unit test environment", () => {
  it("runs in the pinned non-UTC time zone so time-zone bugs surface", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("Europe/Amsterdam");
  });
});
