import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-shell/app-header";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/app-shell/skip-link";
import { signOut } from "@/server/actions/auth";
import { getSessionUser } from "@/server/session-user";

/** Layouts do not re-render on soft navigation, so every page under here calls `requireSession()` too. */
export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SkipLink />
      <AppHeader email={user.email} signOut={signOut} />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 scroll-mt-14 px-4 py-6 outline-none sm:px-6 sm:py-8"
      >
        {children}
      </main>
    </div>
  );
}
