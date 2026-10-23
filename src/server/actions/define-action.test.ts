import { notFound, RedirectType } from "next/navigation";
import {
  getAccessFallbackHTTPStatus,
  isHTTPAccessFallbackError,
} from "next/dist/client/components/http-access-fallback/http-access-fallback";
import { getRedirectError, getURLFromRedirectError } from "next/dist/client/components/redirect";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createTestDb, insertTestUser, type TestDb } from "@/server/db/testing";
import { createRepositories, type Repositories } from "@/server/repositories";
import { createActionRunner } from "./define-action";

const schema = z.object({ name: z.string().trim().min(1, { error: "Enter a name" }) });

describe("defineAction pipeline (real temp DB)", () => {
  let testDb: TestDb;
  let repos: Repositories;
  let userId: string;
  // Named fakes: `getSession` stands in for the cookie read and `revalidate` for `revalidatePath`, neither
  // of which can run outside a Next request.
  let getSession: ReturnType<typeof vi.fn<() => Promise<{ userId: string } | null>>>;
  let revalidate: ReturnType<typeof vi.fn<(path: string) => void>>;
  let defineAction: ReturnType<typeof createActionRunner>;

  beforeEach(async () => {
    testDb = await createTestDb();
    repos = createRepositories(testDb.db);
    userId = await insertTestUser(testDb.db, "owner@example.com");
    getSession = vi.fn(() => Promise.resolve({ userId }));
    revalidate = vi.fn();
    defineAction = createActionRunner({ getSession, getRepositories: () => Promise.resolve(repos), revalidate });
  });
  afterEach(async () => {
    await testDb.cleanup();
  });

  const createList = () =>
    defineAction(
      schema,
      async (ctx) => ({ ok: true, data: await ctx.repos.lists.create(ctx.userId, ctx.input.name) }),
      { revalidate: (_input, list) => ["/lists", `/lists/${list.id}`] },
    );

  it("R-DATA-2: runs the handler with the parsed input and session user, then revalidates", async () => {
    const result = await createList()({ name: "  Groceries  " });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe("Groceries");
    await expect(repos.lists.get(userId, result.data.id)).resolves.toMatchObject({ name: "Groceries" });
    expect(revalidate.mock.calls).toEqual([["/lists"], [`/lists/${result.data.id}`]]);
  });

  it("R-DATA-2: returns fieldErrors for invalid input without calling the handler", async () => {
    const handler = vi.fn();
    const action = defineAction(schema, handler);

    await expect(action({ name: "   " })).resolves.toEqual({ ok: false, fieldErrors: { name: ["Enter a name"] } });
    expect(handler).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("redirects to /login without a session, before parsing or running anything", async () => {
    getSession.mockResolvedValue(null);
    const handler = vi.fn();

    await expect(defineAction(schema, handler)({ name: "x" })).rejects.toSatisfy(
      (error: unknown) => isRedirectError(error) && getURLFromRedirectError(error) === "/login",
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it("skips the session check for a public action and gives it no user", async () => {
    getSession.mockResolvedValue(null);
    const handler = vi.fn((ctx: { userId: null }) => Promise.resolve({ ok: true as const, data: ctx.userId }));

    await expect(defineAction(schema, handler, { public: true })({ name: "x" })).resolves.toEqual({
      ok: true,
      data: null,
    });
    expect(getSession).not.toHaveBeenCalled();
  });

  it("does not revalidate after an expected failure", async () => {
    const action = defineAction(schema, () => Promise.resolve({ ok: false, formError: "List not found" }), {
      revalidate: () => ["/lists"],
    });

    await expect(action({ name: "x" })).resolves.toEqual({ ok: false, formError: "List not found" });
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("accepts FormData from a form action", async () => {
    const form = new FormData();
    form.set("name", "From a form");

    const result = await createList()(form);
    expect(result.ok && result.data.name).toBe("From a form");
  });

  it("treats a call with no arguments as an empty object", async () => {
    const action = defineAction(z.object({}), () => Promise.resolve({ ok: true, data: "ran" }));
    await expect(action()).resolves.toEqual({ ok: true, data: "ran" });
  });

  it("passes bound arguments to the handler and parses only the last argument", async () => {
    const handler = vi.fn((ctx: { input: { name: string }; bound: readonly [next: unknown] }) =>
      Promise.resolve({ ok: true as const, data: ctx }),
    );
    const action = defineAction<typeof schema, unknown, [next: unknown]>(schema, handler);

    const bound = action.bind(null, "/lists/abc");
    await bound({ name: "x" });
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ input: { name: "x" }, bound: ["/lists/abc"] });

    // Compile-time only: the runtime takes the last argument as the input, so a bound call must supply it.
    const callWithoutInput = () =>
      // @ts-expect-error a bound action requires its input
      bound();
    expect(typeof callWithoutInput).toBe("function");
  });

  it("hands bound values to the handler as unknown, whatever type the caller declared", async () => {
    const action = defineAction<typeof schema, string, [listId: string]>(schema, (ctx) => {
      // @ts-expect-error a client-supplied bound value is unknown until the handler validates it
      const trusted: string = ctx.bound[0];
      return Promise.resolve({ ok: true, data: typeof trusted });
    });

    await expect(action.bind(null, "not-checked")({ name: "x" })).resolves.toEqual({ ok: true, data: "string" });
  });

  it("lets an unexpected error propagate untouched", async () => {
    const boom = new Error("database is down");
    await expect(defineAction(schema, () => Promise.reject(boom))({ name: "x" })).rejects.toBe(boom);
  });

  it("rethrows Next's redirect signal untouched", async () => {
    const signal = getRedirectError("/elsewhere", RedirectType.replace);
    await expect(defineAction(schema, () => Promise.reject(signal))({ name: "x" })).rejects.toBe(signal);
  });

  it("lets notFound() from a handler reach Next as a 404 signal", async () => {
    const action = defineAction(schema, async () => notFound());
    await expect(action({ name: "x" })).rejects.toSatisfy(
      (error: unknown) => isHTTPAccessFallbackError(error) && getAccessFallbackHTTPStatus(error) === 404,
    );
  });
});
