"use client";

import { toast } from "sonner";
import type { TaskList } from "@/contracts";
import { ListNameDialog } from "./list-name-dialog";
import type { RenameListAction } from "./types";

export interface RenameListDialogProps {
  list: Pick<TaskList, "id" | "name">;
  renameList: RenameListAction;
  /** Runs after a successful rename, before the dialog asks to close. */
  onRenamed?: (list: TaskList) => void;
  open: boolean;
  /** Called with `false` on cancel and after a successful rename; the host decides where focus goes. */
  onOpenChange: (open: boolean) => void;
}

export function RenameListDialog({ list, renameList, onRenamed, open, onOpenChange }: RenameListDialogProps) {
  return (
    <ListNameDialog
      title={`Rename “${list.name}”`}
      description="The new name shows everywhere the list appears."
      submitLabel="Save name"
      pendingLabel="Saving…"
      defaultName={list.name}
      selectOnOpen
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={({ name }) => renameList({ id: list.id, name })}
      onSuccess={(renamed) => {
        toast.success("List renamed");
        onRenamed?.(renamed);
      }}
    />
  );
}
