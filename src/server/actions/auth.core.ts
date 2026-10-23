import "server-only";
import type { ActionResult, LoginOutput } from "@/contracts";
import { DUMMY_PASSWORD_HASH } from "@/server/auth/password";
import { safeRedirect } from "@/server/auth/safe-redirect";
import { signSessionToken } from "@/server/auth/token";
import type { Repositories } from "@/server/repositories";

export const SIGN_IN_FAILED = "Email or password is incorrect.";
export const DEFAULT_AFTER_SIGN_IN = "/lists";

export interface SignInDeps {
  repos: Pick<Repositories, "users">;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
  setSessionCookie: (token: string) => Promise<void>;
  secret: string;
  now: () => Date;
}

/**
 * Checks the credentials and, on success, sets the session cookie and returns where to go next. An unknown
 * email still runs a full bcrypt compare (against the dummy hash) and gets the same message as a wrong
 * password, so neither the response nor its timing tells whether the account exists.
 */
export async function signInWithPassword(
  { input, next }: { input: LoginOutput; next: unknown },
  deps: SignInDeps,
): Promise<ActionResult<{ redirectTo: string }>> {
  const user = await deps.repos.users.findByEmail(input.email);
  const matches = await deps.verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (user === null || !matches) return { ok: false, formError: SIGN_IN_FAILED };

  await deps.setSessionCookie(await signSessionToken(user.id, deps.secret, deps.now()));
  return { ok: true, data: { redirectTo: safeRedirect(next) ?? DEFAULT_AFTER_SIGN_IN } };
}
