"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import { useId } from "react";
import { SignOutButton, type SignOutAction } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";

export interface UserMenuProps {
  email: string;
  signOut: SignOutAction;
}

/**
 * A popover, not a dropdown menu: its content is auth's `SignOutButton`, a plain button with its own pending
 * state, which cannot be a `menuitem`.
 */
export function UserMenu({ email, signOut }: UserMenuProps) {
  const headingId = useId();
  const initial = email.charAt(0).toUpperCase();

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <Button variant="ghost" className="gap-2 px-1.5 sm:px-2">
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
          >
            {initial}
          </span>
          {/* Named by its content, not aria-label, so the visible email is always part of the name. */}
          <span className="sr-only">Account: </span>
          {/* Two copies, not `sm:not-sr-only`: that utility resets overflow and white-space, undoing `truncate`. */}
          <span className="sr-only sm:hidden">{email}</span>
          <span className="hidden max-w-56 truncate sm:block">{email}</span>
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={4}
          aria-labelledby={headingId}
          className="z-50 grid w-64 max-w-[calc(100vw-1rem)] origin-(--radix-popover-content-transform-origin) gap-3 rounded-md border bg-popover p-3 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="grid gap-0.5">
            <p id={headingId} className="text-xs text-muted-foreground">
              Signed in as
            </p>
            <p className="text-sm font-medium break-all">{email}</p>
          </div>
          <div className="border-t pt-2">
            <SignOutButton signOut={signOut} />
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
