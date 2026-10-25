import type { Metadata } from "next";
import { AppHeader } from "@/components/app-shell/app-header";
import { Brand } from "@/components/app-shell/brand";
import { NotFoundView } from "@/components/app-shell/not-found-view";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOut } from "@/server/actions/auth";
import { getSession } from "@/server/auth/session";
import { getRepositories } from "@/server/repositories";

export const metadata: Metadata = { title: "Page not found" };

/** Unmatched URLs render outside every layout but the root, so this frame mirrors the app shell's structure. */
export default async function NotFound() {
  const session = await getSession();
  const user = session === null ? null : await (await getRepositories()).users.findById(session.userId);

  return (
    <div className="flex min-h-dvh flex-col bg-background bg-cover bg-center bg-no-repeat text-foreground bg-[url('/images/login-background.png')] dark:bg-[url('/images/login-background-dark.png')]">
      {user === null ? (
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-[60px] [header:has(~_div_[data-wide-page])_&]:max-w-[90rem]">
            <Brand />
            <ThemeToggle />
          </div>
        </header>
      ) : (
        <AppHeader email={user.email} signOut={signOut} />
      )}
      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-5xl flex-1 scroll-mt-14 px-4 py-6 outline-none has-[[data-wide-page]]:max-w-[90rem] sm:px-6 sm:py-8 lg:px-[60px]">
          <NotFoundView />
        </main>
      </div>
    </div>
  );
}
