"use client";

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { PendingButton } from "@/components/common/pending-button";
import { Button } from "@/components/ui/button";
import { StatePageShell } from "./state-page-shell";

export interface ErrorViewProps {
  onRetry: () => void | Promise<void>;
  /** Next's hash of a server error, for matching server logs; it carries no message, so it is safe to show. */
  digest?: string | undefined;
}

export function ErrorView({ onRetry, digest }: ErrorViewProps) {
  // Next's retry() runs inside its own transition; calling it inside ours joins it, so `pending` lasts until
  // the re-fetched segment commits.
  const [pending, startTransition] = useTransition();

  return (
    <StatePageShell>
      <EmptyState
        icon={TriangleAlertIcon}
        titleAs="h1"
        title="Something went wrong"
        description="This page could not be loaded. Try again, or go back to your lists."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <PendingButton
              type="button"
              pending={pending}
              pendingLabel="Trying again…"
              idleIcon={<RotateCwIcon aria-hidden />}
              size="pill"
              onClick={() => startTransition(onRetry)}
            >
              Try again
            </PendingButton>
            <Button asChild variant="outline" size="pill">
              <Link href="/lists">Back to lists</Link>
            </Button>
          </div>
        }
      >
        {digest ? <p className="font-mono text-xs text-muted-foreground">Reference: {digest}</p> : null}
      </EmptyState>
    </StatePageShell>
  );
}
