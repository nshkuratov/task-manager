"use client";

import { Loader2Icon, LogOutIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/contracts";

/** The `signOut` Server Action. On success it redirects to `/login`, so it resolves to nothing. */
export type SignOutAction = (input: Record<string, never>) => Promise<ActionResult<unknown> | void>;

export function SignOutButton({ signOut }: { signOut: SignOutAction }) {
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-disabled={pending || undefined}
        aria-busy={pending || undefined}
        className="aria-disabled:opacity-50"
        onClick={() => {
          if (pending) return;
          startTransition(async () => {
            const result = await signOut({});
            if (result !== undefined && !result.ok) toast.error(result.formError ?? "Could not sign out. Try again.");
          });
        }}
      >
        {pending ? <Loader2Icon aria-hidden className="animate-spin" /> : <LogOutIcon aria-hidden />}
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      <span role="status" className="sr-only">
        {pending ? "Signing out…" : ""}
      </span>
    </>
  );
}
