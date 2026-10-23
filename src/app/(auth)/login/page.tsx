import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { signIn } from "@/server/actions/auth";
import { DEFAULT_AFTER_SIGN_IN } from "@/server/actions/auth.core";
import { safeRedirect } from "@/server/auth/safe-redirect";
import { getSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const safeNext = safeRedirect(Array.isArray(next) ? next[0] : next);
  if ((await getSession()) !== null) redirect(safeNext ?? DEFAULT_AFTER_SIGN_IN);

  return (
    <div className="grid gap-6 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">Use your account email and password.</p>
      </div>
      <LoginForm signIn={signIn.bind(null, safeNext)} />
    </div>
  );
}
