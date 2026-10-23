import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertTestUser, type TestDb } from "@/server/db/testing";
import { createRepositories } from "@/server/repositories";
import { resolveSessionUser, type SessionUserDeps } from "./session-user";

class RedirectedToLogin extends Error {}

const redirectToLogin = (): never => {
  throw new RedirectedToLogin();
};

describe("resolveSessionUser (real temp DB)", () => {
  let testDb: TestDb;
  let users: SessionUserDeps["users"];

  beforeEach(async () => {
    testDb = await createTestDb();
    users = createRepositories(testDb.db).users;
  });
  afterEach(async () => {
    await testDb.cleanup();
  });

  it("returns the id and email of the session's user, not another user's", async () => {
    await insertTestUser(testDb.db, "first@example.com");
    const userId = await insertTestUser(testDb.db, "second@example.com");
    await expect(
      resolveSessionUser({ requireSession: async () => ({ userId }), users, redirectToLogin }),
    ).resolves.toEqual({ id: userId, email: "second@example.com" });
  });

  it("redirects to sign in when the session's user no longer exists", async () => {
    await expect(
      resolveSessionUser({ requireSession: async () => ({ userId: "deleted-user" }), users, redirectToLogin }),
    ).rejects.toBeInstanceOf(RedirectedToLogin);
  });

  it("lets the session check's own redirect through without reading the user", async () => {
    const signedOut = new Error("NEXT_REDIRECT /login");
    let looked = false;
    await expect(
      resolveSessionUser({
        requireSession: async () => {
          throw signedOut;
        },
        users: {
          findById: async (id) => {
            looked = true;
            return users.findById(id);
          },
        },
        redirectToLogin,
      }),
    ).rejects.toBe(signedOut);
    expect(looked).toBe(false);
  });
});
