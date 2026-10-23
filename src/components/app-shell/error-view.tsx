"use client";

import { Loader2Icon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto grid max-w-md justify-items-center gap-4 py-12 text-center">
      <TriangleAlertIcon aria-hidden className="size-10 text-muted-foreground" />
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          This page could not be loaded. Try again, or go back to your lists.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          aria-disabled={pending || undefined}
          aria-busy={pending || undefined}
          className="aria-disabled:opacity-50"
          onClick={() => {
            if (pending) return;
            startTransition(onRetry);
          }}
        >
          {pending ? <Loader2Icon aria-hidden className="animate-spin" /> : <RotateCwIcon aria-hidden />}
          {pending ? "Trying again…" : "Try again"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/lists">Back to lists</Link>
        </Button>
      </div>
      {digest ? <p className="font-mono text-xs text-muted-foreground">Reference: {digest}</p> : null}
      <span role="status" className="sr-only">
        {pending ? "Trying again…" : ""}
      </span>
    </div>
  );
}
