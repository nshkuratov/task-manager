"use client";

import { PlusIcon } from "lucide-react";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { matchesListQuery } from "@/domain";
import { focusAfterDialog, listLinkId } from "./focus";
import { ListNameDialog } from "./list-name-dialog";
import type { CreateListAction } from "./types";

export interface CreateListDialogProps {
  createList: CreateListAction;
  /** The page's active search: a new list it hides gets no card, so focus goes to the headline instead. */
  query?: string | undefined;
  trigger?: ReactElement;
}

export function CreateListDialog({ createList, query, trigger }: CreateListDialogProps) {
  return (
    <ListNameDialog
      title="New list"
      description="Give the list a name. You can rename it later."
      submitLabel="Create list"
      pendingLabel="Creating…"
      placeholder="e.g. Product launch, Home, Reading..."
      trigger={
        trigger ?? (
          <Button className="h-11 rounded-full px-5">
            <PlusIcon aria-hidden />
            New list
          </Button>
        )
      }
      onSubmit={createList}
      onSuccess={(list) => {
        toast.success("List created");
        focusAfterDialog(matchesListQuery(list.name, query ?? "") ? { targetId: listLinkId(list.id) } : {});
      }}
    />
  );
}
