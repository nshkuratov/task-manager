import type { ReactNode } from "react";
import { AppFrame } from "@/components/app-shell/app-frame";
import { AppHeader } from "@/components/app-shell/app-header";
import { signOut } from "@/server/actions/auth";
import { getSessionUser } from "@/server/session-user";

/** Layouts do not re-render on soft navigation, so every page under here calls `requireSession()` too. */
export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getSessionUser();
  return <AppFrame header={<AppHeader email={user.email} signOut={signOut} />}>{children}</AppFrame>;
}
