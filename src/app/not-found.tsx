import type { Metadata } from "next";
import { AppFrame } from "@/components/app-shell/app-frame";
import { AppHeader } from "@/components/app-shell/app-header";
import { NotFoundView } from "@/components/app-shell/not-found-view";
import { signOut } from "@/server/actions/auth";
import { getOptionalSessionUser } from "@/server/session-user";

export const metadata: Metadata = { title: "Page not found" };

/** Unmatched URLs render outside every layout but the root, so this page brings the app frame itself. */
export default async function NotFound() {
  const user = await getOptionalSessionUser();
  return (
    <AppFrame header={<AppHeader email={user?.email ?? null} signOut={signOut} />}>
      <NotFoundView />
    </AppFrame>
  );
}
