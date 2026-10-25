"use client";

import { FilterXIcon, ListTodoIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, type TaskStatus } from "@/contracts";

export type TasksEmptyProps =
  | {
      variant: "empty";
      /** The "Add task" control. */
      action?: ReactNode;
    }
  | {
      variant: "filtered";
      statuses: readonly TaskStatus[];
      /** Replaces the default URL update (stories). */
      onShowAll?: () => void;
    };

export function TasksEmpty(props: TasksEmptyProps) {
  if (props.variant === "empty") {
    return (
      <EmptyState
        icon={ListTodoIcon}
        title="No tasks yet"
        description="Add the first task to start tracking this list."
        action={props.action}
      />
    );
  }
  return <FilteredEmpty statuses={props.statuses} onShowAll={props.onShowAll} />;
}

function FilteredEmpty({
  statuses,
  onShowAll,
}: {
  statuses: readonly TaskStatus[];
  onShowAll?: (() => void) | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const names = statuses.map((status) => `“${STATUS_LABELS[status]}”`).join(" or ");

  return (
    <EmptyState
      icon={FilterXIcon}
      title={`No tasks with status ${names}`}
      description="The list has tasks, but none with this status."
      action={
        <Button
          variant="outline"
          size="pill"
          aria-busy={pending || undefined}
          onClick={() => {
            startTransition(() => {
              if (onShowAll) onShowAll();
              else router.replace(pathname, { scroll: false });
            });
          }}
        >
          Show all
        </Button>
      }
    />
  );
}
