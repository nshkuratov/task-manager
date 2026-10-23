"use client";

import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DeadlineSummary, TaskCard, type TaskCardProps } from "./task-card";

/**
 * `router.back()` at most once: the modal is an intercepted history entry, and a second call (double Escape, a
 * save landing while closing) would walk back past the list.
 */
function useCloseModal() {
  const router = useRouter();
  const closed = useRef(false);
  return useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    router.back();
  }, [router]);
}

/**
 * The element that had focus when a modal frame mounted outside any dialog: the task link that opened it. Module
 * scope, so the card that replaces its own loading skeleton still knows the link, not the skeleton's button.
 */
let modalOpener: HTMLElement | null = null;
/**
 * True between a frame's unmount and the end of that React commit. A frame mounting meanwhile is the card
 * replacing its skeleton: the skeleton's focused button is already detached, so focus reads as `<body>`.
 */
let replacingFrame = false;

/**
 * Always open: it disappears when `router.back()` changes the route and the slot stops rendering it, so there is
 * no local closed state to fall out of sync with the URL.
 */
function ModalFrame({
  title,
  description,
  onOpenChange,
  children,
  titleClassName,
}: {
  title: ReactNode;
  description: ReactNode;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
  titleClassName?: string;
}) {
  // Before Radix moves focus into the dialog (a passive effect), the opener still has it.
  useLayoutEffect(() => {
    const active = document.activeElement;
    const inDialog = active instanceof HTMLElement && active.closest('[role="dialog"]') !== null;
    if (!replacingFrame && !inDialog) {
      // Nothing focused (Safari does not focus a clicked link): forget the last opener rather than return to it.
      modalOpener = active instanceof HTMLElement && active !== document.body ? active : null;
    }
    return () => {
      replacingFrame = true;
      queueMicrotask(() => {
        replacingFrame = false;
      });
    };
  }, []);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
        // A modal Radix dialog returns focus only to its Trigger; opened by a route, it has none, and focus would
        // drop to <body>. A link removed meanwhile (the task was deleted) keeps that default.
        onCloseAutoFocus={(event) => {
          if (modalOpener?.isConnected !== true) return;
          event.preventDefault();
          modalOpener.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className={titleClassName ?? "pr-6 text-xl leading-tight break-words"}>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export type TaskCardDialogProps = Omit<
  TaskCardProps,
  "headline" | "onSaved" | "onDeleted" | "onDirtyChange" | "onSavingChange"
>;

/** The task card over its list. Closing with unsaved edits asks first; closing after a save or delete does not. */
export function TaskCardDialog(props: TaskCardDialogProps) {
  const close = useCloseModal();
  const [dirty, setDirty] = useState(false);
  const saving = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const focusBeforeConfirm = useRef<HTMLElement | null>(null);

  const requestClose = () => {
    if (saving.current) return;
    if (!dirty) {
      close();
      return;
    }
    focusBeforeConfirm.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirming(true);
  };

  return (
    <ModalFrame
      title={props.task.title}
      description={
        <>
          In {props.listName} · <DeadlineSummary deadlineInfo={props.deadlineInfo} />
        </>
      }
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <TaskCard
        {...props}
        headline="none"
        // The form's dirty flag reaches this component a render after its reset, so these must not use the guard.
        onSaved={close}
        onDeleted={close}
        onDirtyChange={setDirty}
        onSavingChange={(next) => {
          saving.current = next;
        }}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          setConfirming(open);
          // Without a trigger, Radix has nothing to return focus to when the confirm closes.
          if (!open) requestAnimationFrame(() => focusBeforeConfirm.current?.focus());
        }}
        title="Discard unsaved changes?"
        description="Your edits to this task have not been saved."
        confirmLabel="Discard changes"
        pendingLabel="Discarding…"
        cancelLabel="Keep editing"
        onConfirm={close}
      />
    </ModalFrame>
  );
}

/** The intercepted route's `loading.tsx`: the dialog's frame over the list while the card loads. */
export function TaskCardDialogSkeleton() {
  const close = useCloseModal();
  return (
    <ModalFrame
      title="Loading task…"
      description="Fetching the latest details."
      titleClassName="text-xl leading-tight text-muted-foreground"
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <div aria-hidden className="grid gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </ModalFrame>
  );
}

/** The intercepted route's `not-found.tsx`: a missing or foreign task never falls through to the list's 404. */
export function TaskNotFoundDialog() {
  const close = useCloseModal();
  return (
    <ModalFrame
      title="Task not found"
      description="This task doesn't exist or was deleted."
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <div className="flex justify-end">
        <Button onClick={close}>Back to the list</Button>
      </div>
    </ModalFrame>
  );
}
