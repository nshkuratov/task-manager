"use client";

import type { ReactElement } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import type { ActionResult } from "@/contracts";

export interface DeleteListDialogProps {
  name: string;
  taskCount: number;
  onDelete: () => Promise<ActionResult<{ deletedTasks: number }>>;
  /** Runs after a successful delete; the host decides where focus goes. */
  onDeleted?: () => void;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function deleteListTitle(name: string, taskCount: number): string {
  if (taskCount === 0) return `Delete “${name}”?`;
  return `Delete “${name}” and its ${taskCount} ${taskCount === 1 ? "task" : "tasks"}?`;
}

/** Confirms before deleting. A failure keeps the dialog open for a retry and is reported with a toast. */
export function DeleteListDialog({
  name,
  taskCount,
  onDelete,
  onDeleted,
  trigger,
  open,
  onOpenChange,
}: DeleteListDialogProps) {
  return (
    <ConfirmDialog
      title={deleteListTitle(name, taskCount)}
      description="The list and every task in it will be removed. This can’t be undone."
      confirmLabel="Delete list"
      pendingLabel="Deleting…"
      trigger={trigger}
      {...(open === undefined ? {} : { open })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
      onConfirm={async () => {
        const result = await onDelete();
        if (!result.ok) {
          toast.error(result.formError ?? `Couldn’t delete “${name}”.`);
          return false;
        }
        toast.success("List deleted");
        onDeleted?.();
      }}
    />
  );
}
