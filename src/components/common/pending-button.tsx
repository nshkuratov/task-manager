"use client";

import { cn } from "cn";
import { Loader2Icon } from "lucide-react";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type PendingButtonProps = Omit<ComponentProps<typeof Button>, "asChild"> & {
  pending: boolean;
  /** The verb in progress ("Deleting…"): the visible label and the announcement while pending. */
  pendingLabel: string;
  /** Shown before the idle label; replaced by the spinner while pending. */
  idleIcon?: ReactNode;
};

/**
 * A trigger for an async action. While pending it is inert but stays focusable (`aria-disabled`, never the
 * native `disabled`, which would drop focus), swallows clicks and implicit submits, and announces
 * `pendingLabel` through a status region that is always mounted, since a region inserted at the moment of
 * change is often not read. The region is a sibling, not a child, so it stays out of the button's name.
 * Because it renders a fragment, it cannot be the child of an `asChild` Slot.
 */
export function PendingButton({
  pending,
  pendingLabel,
  idleIcon,
  children,
  className,
  onClick,
  "aria-disabled": ariaDisabled,
  ...props
}: PendingButtonProps) {
  const blocked = pending || ariaDisabled === true || ariaDisabled === "true";

  return (
    <>
      <Button
        {...props}
        aria-disabled={blocked || undefined}
        aria-busy={pending || undefined}
        className={cn("aria-disabled:opacity-50", className)}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          if (pending) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
      >
        {pending ? (
          <>
            <Loader2Icon aria-hidden className="animate-spin" />
            {pendingLabel}
          </>
        ) : (
          <>
            {idleIcon}
            {children}
          </>
        )}
      </Button>
      <span role="status" className="sr-only">
        {pending ? pendingLabel : ""}
      </span>
    </>
  );
}
