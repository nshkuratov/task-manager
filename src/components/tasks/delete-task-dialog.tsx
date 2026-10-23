"use client";

import type { ReactElement } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import type { ActionResult } from "@/contracts";

export interface DeleteTaskDialogProps {
  title: string;
  onDelete: () => Promise<ActionResult<{ listId: string }>>;
  /** Runs after a successful delete; the host owns the success toast and any navigation. */
  onDeleted?: (listId: string) => void;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Confirms before deleting. A failure keeps the dialog open for a retry and is reported with a toast. */
export function DeleteTaskDialog({ title, onDelete, onDeleted, trigger, open, onOpenChange }: DeleteTaskDialogProps) {
  return (
    <ConfirmDialog
      title={`Delete “${title}”?`}
      description="This cannot be undone."
      confirmLabel="Delete task"
      pendingLabel="Deleting…"
      trigger={trigger}
      {...(open === undefined ? {} : { open })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
      onConfirm={async () => {
        const result = await onDelete();
        if (!result.ok) {
          toast.error(result.formError ?? `Couldn’t delete “${title}”.`);
          return false;
        }
        onDeleted?.(result.data.listId);
      }}
    />
  );
}
