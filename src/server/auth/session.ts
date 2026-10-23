import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "@/server/env";
import { getRepositories, type Repositories } from "@/server/repositories";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, verifySessionToken } from "./token";

export interface Session {
  userId: string;
}

export interface SessionDeps {
  secret: string;
  now: Date;
  users: Pick<Repositories["users"], "findById">;
}

/**
 * A session only for a valid token whose user still exists, so a token that outlives a re-seed reads as
 * signed out. Repository errors propagate: a database outage is not a sign-out.
 */
export async function resolveSession(token: string | undefined, deps: SessionDeps): Promise<Session | null> {
  if (token === undefined) return null;
  const claims = await verifySessionToken(token, deps.secret, { currentDate: deps.now });
  if (claims === null) return null;
  const user = await deps.users.findById(claims.userId);
  return user === null ? null : { userId: user.id };
}

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const { users } = await getRepositories();
  return resolveSession(token, { secret: env.sessionSecret, now: new Date(), users });
});

/** The current session; without one, redirects to `/login`. Call it in every page and action, not only layouts. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (session === null) redirect("/login");
  return session;
}

export function sessionCookieOptions(nodeEnv: string | undefined) {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: nodeEnv === "production",
    maxAge: SESSION_TTL_SECONDS,
  } as const;
}

/** Server Actions and route handlers only: cookies cannot be written while rendering. */
export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(process.env.NODE_ENV));
}

/** Server Actions and route handlers only. The token itself stays valid until it expires (stateless JWT). */
export async function destroySession(): Promise<void> {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
}
