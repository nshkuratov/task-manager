import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loginSchema } from "@/contracts";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/server/auth/password";
import { verifySessionToken } from "@/server/auth/token";
import { createTestDb, type TestDb } from "@/server/db/testing";
import { createRepositories, type Repositories } from "@/server/repositories";
import { DEFAULT_AFTER_SIGN_IN, SIGN_IN_FAILED, signInWithPassword } from "./auth.core";
import { createActionRunner } from "./define-action";

// The seed module is off-limits to tests outside the data layer (lint), so the database is seeded by the
// real `db:seed` CLI, and the spec's demo credential is written out here.
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "Admin123!";
const SECRET = "a-test-secret-that-is-at-least-32-characters-long";
const NOW = new Date("2026-10-22T10:00:00Z");

async function seedWithCli(dbPath: string): Promise<string> {
  const root = path.resolve(import.meta.dirname, "../../..");
  const { stdout } = await promisify(execFile)(
    path.join(root, "node_modules/.bin/tsx"),
    ["--conditions=react-server", "src/server/db/cli/seed.ts"],
    { cwd: root, env: { ...process.env, DATABASE_URL: `file:${dbPath}`, VERCEL: "", DATABASE_AUTH_TOKEN: "" } },
  );
  return stdout.trim();
}

describe("signIn core (temp DB seeded by the real db:seed CLI)", () => {
  let testDb: TestDb;
  let realRepos: Repositories;
  let adminId: string;
  // Named fakes: a recorder for the cookie (`cookies()` cannot run outside Next), a spy over the real
  // `verifyPassword`, and spies over the real repositories.
  let cookieTokens: string[];
  let verifyPasswordSpy: ReturnType<typeof vi.fn<typeof verifyPassword>>;
  let repos: Repositories;
  let findByEmail: ReturnType<typeof vi.fn<Repositories["users"]["findByEmail"]>>;

  beforeAll(async () => {
    testDb = await createTestDb();
    expect(await seedWithCli(testDb.path)).toBe("seeded: user created, 4 lists inserted");
    realRepos = createRepositories(testDb.db);
    const admin = await realRepos.users.findByEmail(ADMIN_EMAIL);
    if (admin === null) throw new Error("the seed did not create the admin");
    adminId = admin.id;
  }, 60_000);
  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(() => {
    cookieTokens = [];
    verifyPasswordSpy = vi.fn(verifyPassword);
    findByEmail = vi.fn(realRepos.users.findByEmail);
    repos = { ...realRepos, users: { ...realRepos.users, findByEmail } };
  });

  const deps = () => ({
    repos,
    verifyPassword: verifyPasswordSpy,
    setSessionCookie: (token: string) => {
      cookieTokens.push(token);
      return Promise.resolve();
    },
    secret: SECRET,
    now: () => NOW,
  });

  const signIn = (email: string, password: string, next: unknown = null) =>
    signInWithPassword({ input: loginSchema.parse({ email, password }), next }, deps());

  it("R-AUTH-4: signs the admin in with the spec's credentials and sets a session for them", async () => {
    await expect(signIn(ADMIN_EMAIL, ADMIN_PASSWORD)).resolves.toEqual({
      ok: true,
      data: { redirectTo: DEFAULT_AFTER_SIGN_IN },
    });
    expect(cookieTokens).toHaveLength(1);
    await expect(verifySessionToken(cookieTokens[0] ?? "", SECRET, { currentDate: NOW })).resolves.toEqual({
      userId: adminId,
    });
  });

  it("R-AUTH-4: accepts the email in any case and with surrounding spaces", async () => {
    const result = await signIn("  Admin@Example.COM ", ADMIN_PASSWORD);
    expect(result.ok).toBe(true);
  });

  it("goes to a safe `next` and ignores an unsafe one", async () => {
    await expect(signIn(ADMIN_EMAIL, ADMIN_PASSWORD, "/lists/abc?x=1")).resolves.toMatchObject({
      data: { redirectTo: "/lists/abc?x=1" },
    });
    for (const next of ["//evil.com", "/.//evil.com", "https://evil.com", 42]) {
      await expect(signIn(ADMIN_EMAIL, ADMIN_PASSWORD, next)).resolves.toMatchObject({
        data: { redirectTo: DEFAULT_AFTER_SIGN_IN },
      });
    }
  });

  it("R-AUTH-3: a wrong password gets the generic message and no session", async () => {
    await expect(signIn(ADMIN_EMAIL, "Admin123?")).resolves.toEqual({ ok: false, formError: SIGN_IN_FAILED });
    expect(cookieTokens).toEqual([]);
  });

  it("R-AUTH-3: an unknown email gets the same message, after a full compare against the dummy hash", async () => {
    await expect(signIn("nobody@example.com", ADMIN_PASSWORD)).resolves.toEqual({
      ok: false,
      formError: SIGN_IN_FAILED,
    });
    expect(verifyPasswordSpy).toHaveBeenCalledExactlyOnceWith(ADMIN_PASSWORD, DUMMY_PASSWORD_HASH);
    expect(cookieTokens).toEqual([]);
  });

  it("the dummy hash costs as much as the seeded admin's hash", async () => {
    const admin = await realRepos.users.findByEmail(ADMIN_EMAIL);
    expect(bcrypt.getRounds(DUMMY_PASSWORD_HASH)).toBe(bcrypt.getRounds(admin?.passwordHash ?? ""));
  });

  it("R-AUTH-2: malformed input through the action pipeline returns fieldErrors and never reads the DB", async () => {
    const getSession = vi.fn(() => Promise.resolve(null));
    const defineAction = createActionRunner({
      getSession,
      getRepositories: () => Promise.resolve(repos),
      revalidate: vi.fn(),
    });
    const action = defineAction(
      loginSchema,
      (ctx) => signInWithPassword({ input: ctx.input, next: null }, { ...deps(), repos: ctx.repos }),
      { public: true },
    );

    const result = await action({ email: "not-an-email", password: "" });
    expect(result).toEqual({
      ok: false,
      fieldErrors: { email: ["Enter a valid email address"], password: ["Enter your password"] },
    });
    expect(findByEmail).not.toHaveBeenCalled();
    expect(verifyPasswordSpy).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
  });
});
