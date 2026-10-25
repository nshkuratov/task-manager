import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-shell/app-header";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/app-shell/skip-link";
import { signOut } from "@/server/actions/auth";
import { getSessionUser } from "@/server/session-user";

/** Layouts do not re-render on soft navigation, so every page under here calls `requireSession()` too. */
export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getSessionUser();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background bg-cover bg-center bg-no-repeat text-foreground has-[[data-app-bg]]:bg-[url('/images/login-background.png')] dark:has-[[data-app-bg]]:bg-[url('/images/login-background-dark.png')]">
      <SkipLink />
      <AppHeader email={user.email} signOut={signOut} />
      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 scroll-mt-14 px-4 py-6 outline-none has-[[data-wide-page]]:max-w-[90rem] sm:px-6 sm:py-8 lg:px-[60px]"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
