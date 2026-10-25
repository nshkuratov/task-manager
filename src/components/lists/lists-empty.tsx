import { ListTodoIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export type ListsEmptyProps =
  | {
      kind: "no-lists";
      /** The way to create one (a `CreateListDialog`). */
      action: ReactNode;
    }
  | { kind: "no-matches"; query: string };

export function ListsEmpty(props: ListsEmptyProps) {
  if (props.kind === "no-lists") {
    return (
      <EmptyState
        icon={ListTodoIcon}
        title="Create your first list"
        description="A list groups related tasks and shows their progress and deadlines at a glance."
        action={props.action}
      />
    );
  }
  return (
    <EmptyState
      icon={SearchXIcon}
      title={`No lists match “${props.query}”`}
      description="Check the spelling or try a shorter search."
      action={
        <Button asChild variant="outline" className="h-10 rounded-full px-5 dark:bg-transparent">
          <Link href="/lists">Clear search</Link>
        </Button>
      }
    />
  );
}
