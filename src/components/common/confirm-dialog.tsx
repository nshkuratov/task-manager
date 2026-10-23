"use client";

import { Loader2Icon } from "lucide-react";
import { useState, type ReactElement, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConfirmResult = void | boolean;

export interface ConfirmDialogProps {
  title: ReactNode;
  /** The consequence, naming what is lost ("Its 4 tasks will be deleted too."). */
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  cancelLabel?: string;
  /**
   * Runs on confirm; the dialog stays open and pending until it settles. Return (or resolve to) `false`
   * to keep it open — an expected failure the caller has already reported with a toast. A throw is
   * unexpected and reaches the nearest error boundary.
   */
  onConfirm: () => ConfirmResult | Promise<ConfirmResult>;
  /** Uncontrolled mode: the element that opens the dialog and gets focus back when it closes. */
  trigger?: ReactElement | undefined;
  /** Controlled mode, e.g. opened from a menu item. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancel",
  onConfirm,
  trigger,
  open: controlledOpen,
  onOpenChange,
  destructive = true,
}: ConfirmDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [, setFailure] = useState<null>(null);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const confirm = async () => {
    setPending(true);
    let result: ConfirmResult;
    try {
      result = await onConfirm();
    } catch (error) {
      // Deliberately not narrowed: nothing is handled here. Every rejection is unexpected (expected
      // failures return false) and is rethrown during render so the nearest error boundary receives it.
      setFailure(() => {
        throw error;
      });
      return;
    } finally {
      setPending(false);
    }
    if (result !== false) setOpen(false);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            // aria-disabled, not disabled: disabling the focused button would drop focus out of the dialog.
            aria-disabled={pending || undefined}
            className="aria-disabled:opacity-50"
            onClick={(event) => {
              // Action is a Radix Close button; keep the dialog open until onConfirm settles.
              event.preventDefault();
              if (!pending) void confirm();
            }}
          >
            {pending ? (
              <>
                <Loader2Icon aria-hidden className="animate-spin" />
                {pendingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
        <p role="status" className="sr-only">
          {pending ? pendingLabel : ""}
        </p>
      </AlertDialogContent>
    </AlertDialog>
  );
}
