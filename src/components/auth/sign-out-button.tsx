"use client";

import { LogOutIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { PendingButton } from "@/components/common/pending-button";
import type { ActionResult } from "@/contracts";

/** The `signOut` Server Action. On success it redirects to `/login`, so it resolves to nothing. */
export type SignOutAction = (input: Record<string, never>) => Promise<ActionResult<unknown> | void>;

export function SignOutButton({ signOut }: { signOut: SignOutAction }) {
  const [pending, startTransition] = useTransition();

  return (
    <PendingButton
      type="button"
      variant="ghost"
      pending={pending}
      pendingLabel="Signing out…"
      idleIcon={<LogOutIcon aria-hidden />}
      className="w-full justify-start rounded-lg"
      onClick={() => {
        startTransition(async () => {
          const result = await signOut({});
          if (result !== undefined && !result.ok) toast.error(result.formError ?? "Could not sign out. Try again.");
        });
      }}
    >
      Sign out
    </PendingButton>
  );
}
