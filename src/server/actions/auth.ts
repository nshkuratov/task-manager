"use server";
import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import { loginSchema, type LoginOutput } from "@/contracts";
import { verifyPassword } from "@/server/auth/password";
import { destroySession, setSessionCookie } from "@/server/auth/session";
import { env } from "@/server/env";
import { defineAction, type ActionContext } from "./define-action";
import { signInWithPassword } from "./auth.core";

/** Bind the post-sign-in path first: `signIn.bind(null, next)`. It is re-checked here, never trusted. */
export const signIn = defineAction(
  loginSchema,
  async ({ input, repos, bound: [next] }: ActionContext<LoginOutput, [next: unknown], null>) => {
    const result = await signInWithPassword(
      { input, next },
      { repos, verifyPassword, setSessionCookie, secret: env.sessionSecret, now: () => new Date() },
    );
    if (result.ok) redirect(result.data.redirectTo);
    return result;
  },
  { public: true },
);

export const signOut = defineAction(z.object({}), async () => {
  await destroySession();
  redirect("/login");
});
