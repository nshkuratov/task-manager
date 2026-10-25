import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginCard } from "@/components/auth/login-card";
import { signIn } from "@/server/actions/auth";
import { DEFAULT_AFTER_SIGN_IN } from "@/server/actions/auth.core";
import { safeRedirect } from "@/server/auth/safe-redirect";
import { getSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const safeNext = safeRedirect(Array.isArray(next) ? next[0] : next);
  if ((await getSession()) !== null) redirect(safeNext ?? DEFAULT_AFTER_SIGN_IN);

  return <LoginCard signIn={signIn.bind(null, safeNext)} />;
}
