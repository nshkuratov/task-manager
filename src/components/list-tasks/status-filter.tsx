"use client";

import { cn } from "cn";
import { Loader2Icon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/contracts";
import { statusFilterHref } from "./status-filter-href";

const isTaskStatus = (value: string): value is TaskStatus => (TASK_STATUSES as readonly string[]).includes(value);

// The pressed state must stand out from hover, which already uses the muted/accent fills.
const PRESSED = "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary";

export interface StatusFilterProps {
  /** The statuses in the URL; empty means "All". */
  selected: readonly TaskStatus[];
  /** Tasks per status over the whole list, whatever is selected. */
  counts: Record<TaskStatus, number>;
  /** Replaces the default URL update (stories). */
  onChange?: (statuses: TaskStatus[]) => void;
}

/**
 * The choice shows at once and the URL (`?status=`) follows in a transition, so the server re-renders the
 * filtered table; back/forward restore it because the URL is the state.
 */
export function StatusFilter({ selected, counts, onChange }: StatusFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [optimistic, setOptimistic] = useOptimistic<readonly TaskStatus[]>(selected);
  const [pending, startTransition] = useTransition();

  const change = (next: TaskStatus[]) => {
    startTransition(() => {
      setOptimistic(next);
      if (onChange) onChange(next);
      else router.replace(statusFilterHref(pathname, next), { scroll: false });
    });
  };

  return (
    <div
      role="group"
      aria-label="Filter by status"
      aria-busy={pending || undefined}
      className="flex flex-wrap items-center gap-2"
    >
      <Toggle
        variant="outline"
        className={cn("h-10 rounded-full border-border bg-background px-5", PRESSED)}
        pressed={optimistic.length === 0}
        onPressedChange={() => {
          if (optimistic.length > 0) change([]);
        }}
      >
        All
      </Toggle>
      <ToggleGroup
        type="multiple"
        variant="outline"
        aria-label="Statuses"
        className="divide-x divide-border rounded-full border border-border bg-background shadow-xs"
        value={[...optimistic]}
        onValueChange={(values) => {
          const chosen = values.filter(isTaskStatus);
          change(TASK_STATUSES.filter((status) => chosen.includes(status)));
        }}
      >
        {TASK_STATUSES.map((status) => (
          <ToggleGroupItem
            key={status}
            value={status}
            className={cn(
              "h-10 gap-1.5 border-0 px-4 data-[spacing=0]:first:rounded-l-full data-[spacing=0]:last:rounded-r-full data-[spacing=0]:data-[variant=outline]:first:border-l-0",
              PRESSED,
            )}
          >
            {STATUS_LABELS[status]}
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground tabular-nums">
              {counts[status]}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {pending ? <Loader2Icon aria-hidden className="size-4 animate-spin text-muted-foreground" /> : null}
      <p role="status" className="sr-only">
        {pending ? "Updating tasks…" : ""}
      </p>
    </div>
  );
}
