import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requireSession, type Session } from "@/server/auth/session";
import { getRepositories, type Repositories, type UserIdentity } from "@/server/repositories";

export interface SessionUserDeps {
  requireSession: () => Promise<Session>;
  users: Pick<Repositories["users"], "findById">;
  redirectToLogin: () => never;
}

/** The session's user; a user deleted after the session was checked is sent to sign in, never returned as null. */
export async function resolveSessionUser(deps: SessionUserDeps): Promise<UserIdentity> {
  const session = await deps.requireSession();
  const user = await deps.users.findById(session.userId);
  if (user === null) deps.redirectToLogin();
  return user;
}

/**
 * The signed-in user's identity; without a session, or if the user vanished after it was checked, redirects
 * to `/login`. It repeats `getSession`'s user lookup because `Session` carries only the id.
 */
export const getSessionUser = cache(async (): Promise<UserIdentity> =>
  resolveSessionUser({
    requireSession,
    users: (await getRepositories()).users,
    redirectToLogin: () => redirect("/login"),
  }),
);
