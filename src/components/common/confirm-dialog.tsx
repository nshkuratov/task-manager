"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PendingButton } from "./pending-button";

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
        className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-3xl p-6 data-[size=default]:sm:max-w-[400px]"
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <AlertDialogHeader className="place-items-start text-left sm:place-items-start sm:text-left">
          <AlertDialogTitle
            className="line-clamp-2 max-w-full text-xl leading-7 font-medium tracking-tight break-words"
            title={typeof title === "string" ? title : undefined}
          >
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-1 flex-row justify-end gap-3">
          <AlertDialogCancel className="h-10 rounded-full px-5 dark:bg-transparent" disabled={pending}>
            {cancelLabel}
          </AlertDialogCancel>
          <PendingButton
            type="button"
            variant={destructive ? "destructive" : "default"}
            className="h-10 rounded-full px-5"
            pending={pending}
            pendingLabel={pendingLabel}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </PendingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
