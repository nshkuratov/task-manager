"use client";

import { EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskList } from "@/contracts";
import { matchesListQuery } from "@/domain";
import { DeleteListDialog } from "./delete-list-dialog";
import { focusAfterDialog, listActionsId, listCardSelector } from "./focus";
import { RenameListDialog } from "./rename-list-dialog";
import type { DeleteListAction, RenameListAction } from "./types";

export interface ListCardMenuProps {
  list: Pick<TaskList, "id" | "name">;
  taskCount: number;
  renameList: RenameListAction;
  deleteList: DeleteListAction;
  /** The page's active search: a rename it no longer matches takes the card off the page. */
  query?: string | undefined;
}

/**
 * Rename / Delete for one list. The menu is non-modal: a modal one aria-hides the page around a still-focusable
 * trigger. The dialogs open from state after the menu has closed, and focus comes back to this trigger —
 * unless the card leaves the page (deleted, or renamed out of the active search); then it goes to the headline.
 */
export function ListCardMenu({ list, taskCount, renameList, deleteList, query }: ListCardMenuProps) {
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const cardLeaves = useRef(false);
  const triggerId = listActionsId(list.id);

  const open = (next: "rename" | "delete") => {
    cardLeaves.current = false;
    setDialog(next);
  };
  const close = () => {
    setDialog(null);
    focusAfterDialog(cardLeaves.current ? { goneSelector: listCardSelector(list.id) } : { targetId: triggerId });
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            id={triggerId}
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={`Actions for “${list.name}”`}
          >
            <EllipsisIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => open("rename")}>
            <PencilIcon aria-hidden />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => open("delete")}>
            <Trash2Icon aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameListDialog
        list={list}
        renameList={renameList}
        onRenamed={(renamed) => {
          cardLeaves.current = !matchesListQuery(renamed.name, query ?? "");
        }}
        open={dialog === "rename"}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      />
      <DeleteListDialog
        name={list.name}
        taskCount={taskCount}
        onDelete={() => deleteList({ id: list.id })}
        onDeleted={() => {
          cardLeaves.current = true;
        }}
        open={dialog === "delete"}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      />
    </>
  );
}
