import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertTestUser, type TestDb } from "@/server/db/testing";
import { createRepositories, type Repositories } from "@/server/repositories";

let testDb: TestDb;
let repos: Repositories;
let adminId: string;

beforeEach(async () => {
  testDb = await createTestDb();
  repos = createRepositories(testDb.db);
  adminId = await insertTestUser(testDb.db, "admin@example.com");
});
afterEach(async () => {
  await testDb.cleanup();
});

describe("users repository", () => {
  it("R-AUTH-4: finds a user by email regardless of case and surrounding spaces", async () => {
    const found = await repos.users.findByEmail("  Admin@Example.COM ");
    expect(found).toEqual({ id: adminId, email: "admin@example.com", passwordHash: "not-a-real-hash" });
  });

  it("returns null for an unknown email", async () => {
    expect(await repos.users.findByEmail("nobody@example.com")).toBeNull();
    expect(await repos.users.findByEmail("")).toBeNull();
  });

  it("finds a user by id without exposing the password hash", async () => {
    expect(await repos.users.findById(adminId)).toEqual({ id: adminId, email: "admin@example.com" });
    expect(await repos.users.findById(crypto.randomUUID())).toBeNull();
  });
});
