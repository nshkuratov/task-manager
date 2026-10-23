import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { guardRequest } from "./guard";
import { SESSION_COOKIE, signSessionToken } from "./token";

const SECRET = "a-test-secret-that-is-at-least-32-characters-long";
const NOW = new Date("2026-10-22T10:00:00Z");
const USER_ID = "6f1c1f5e-2a4b-4c1e-9d55-1f0a3c2b7e10";

function request(path: string, { token, method = "GET" }: { token?: string; method?: string } = {}) {
  const headers = token === undefined ? undefined : { cookie: `${SESSION_COOKIE}=${token}` };
  return new NextRequest(`http://localhost:3000${path}`, { method, ...(headers && { headers }) });
}

const guard = (req: NextRequest) => guardRequest(req, { secret: SECRET, now: NOW });
const isPassThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";

describe("guardRequest", () => {
  it("R-AUTH-4: lets a request with a valid token through", async () => {
    const token = await signSessionToken(USER_ID, SECRET, NOW);
    expect(isPassThrough(await guard(request("/lists", { token })))).toBe(true);
  });

  it("sends a signed-out visitor to /login with the path they asked for", async () => {
    const res = await guard(request("/lists"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Flists");
  });

  it("keeps the query of the requested page inside `next`", async () => {
    const res = await guard(request("/lists?q=a&b=c"));
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect([...location.searchParams]).toEqual([["next", "/lists?q=a&b=c"]]);
  });

  it("redirects for a token signed with another secret or expired", async () => {
    const forged = await signSessionToken(USER_ID, `${SECRET}-other`, NOW);
    const expired = await signSessionToken(USER_ID, SECRET, new Date("2026-01-01T00:00:00Z"));
    for (const token of [forged, expired, "garbage"]) {
      expect((await guard(request("/lists", { token }))).status).toBe(307);
    }
  });

  it("leaves a Server Action POST to the action's own session check", async () => {
    expect(isPassThrough(await guard(request("/lists", { method: "POST" })))).toBe(true);
  });
});
