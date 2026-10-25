import type { SignOutAction } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Brand } from "./brand";
import { UserMenu } from "./user-menu";

export interface AppHeaderProps {
  /** The signed-in user's email; null on a page anyone can reach (the root 404), which then has no account menu. */
  email: string | null;
  signOut: SignOutAction;
}

export function AppHeader({ email, signOut }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-[60px] [header:has(~_div_[data-wide-page])_&]:max-w-[90rem]">
        <Brand />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {email === null ? null : <UserMenu email={email} signOut={signOut} />}
        </div>
      </div>
    </header>
  );
}
