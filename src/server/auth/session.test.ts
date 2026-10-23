import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertTestUser, type TestDb } from "@/server/db/testing";
import { createRepositories } from "@/server/repositories";
import { resolveSession, sessionCookieOptions } from "./session";
import { SESSION_TTL_SECONDS, signSessionToken } from "./token";

const SECRET = "a-test-secret-that-is-at-least-32-characters-long";
const NOW = new Date("2026-10-22T10:00:00Z");

describe("resolveSession (real temp DB)", () => {
  let testDb: TestDb;
  let userId: string;
  let deps: Parameters<typeof resolveSession>[1];

  beforeEach(async () => {
    testDb = await createTestDb();
    userId = await insertTestUser(testDb.db, "user@example.com");
    deps = { secret: SECRET, now: NOW, users: createRepositories(testDb.db).users };
  });
  afterEach(async () => {
    await testDb.cleanup();
  });

  it("returns the session for a valid token of an existing user", async () => {
    const token = await signSessionToken(userId, SECRET, NOW);
    await expect(resolveSession(token, deps)).resolves.toEqual({ userId });
  });

  it("treats a valid token for a deleted user as signed out", async () => {
    const token = await signSessionToken(userId, SECRET, NOW);
    await testDb.client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });
    await expect(resolveSession(token, deps)).resolves.toBeNull();
  });

  it("passes its clock to verification: an expired token is signed out", async () => {
    const token = await signSessionToken(userId, SECRET, NOW);
    const later = new Date(NOW.getTime() + (SESSION_TTL_SECONDS + 1) * 1000);
    await expect(resolveSession(token, { ...deps, now: later })).resolves.toBeNull();
  });

  it("returns null without a cookie or with an invalid token", async () => {
    await expect(resolveSession(undefined, deps)).resolves.toBeNull();
    await expect(resolveSession("garbage", deps)).resolves.toBeNull();
  });

  it("lets a database failure surface instead of signing the user out", async () => {
    const token = await signSessionToken(userId, SECRET, NOW);
    testDb.client.close();
    await expect(resolveSession(token, deps)).rejects.toThrow();
  });
});

describe("sessionCookieOptions", () => {
  it("R-AUTH-4: is httpOnly, SameSite=Lax, site-wide and lives as long as the token", () => {
    expect(sessionCookieOptions("development")).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: SESSION_TTL_SECONDS,
    });
  });

  it("is Secure in production only", () => {
    expect(sessionCookieOptions("production").secure).toBe(true);
    expect(sessionCookieOptions(undefined).secure).toBe(false);
  });
});
