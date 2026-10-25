import { cn } from "cn";
import { TASK_CARD_PANEL, TASK_METADATA_BOX, TASK_PAGE_FRAME } from "@/components/task-card/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function TaskLoading() {
  return (
    <div role="status" className={TASK_PAGE_FRAME}>
      <span className="sr-only">Loading task…</span>
      <Skeleton aria-hidden className="h-4 w-56" />
      <div aria-hidden className={cn("grid gap-6", TASK_CARD_PANEL)}>
        <div className="grid gap-2">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className={cn("grid gap-2", TASK_METADATA_BOX)}>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="grid gap-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="border-t pt-4">
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>
    </div>
  );
}
