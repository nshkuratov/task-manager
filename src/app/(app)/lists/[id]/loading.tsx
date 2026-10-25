import { Skeleton } from "@/components/ui/skeleton";

/**
 * Next hands a segment's loading UI to every parallel route of its layout, so this renders once for the page and
 * once for the `@modal` slot, side by side. The second copy hides itself (and leaves the accessibility tree).
 */
export default function ListTasksLoading() {
  return (
    <div
      role="status"
      data-app-bg
      data-wide-page
      data-slot="list-tasks-loading"
      className="grid gap-6 [[data-slot=list-tasks-loading]~&]:hidden"
    >
      <span className="sr-only">Loading tasks…</span>
      <div aria-hidden className="grid gap-8">
        <Skeleton className="h-4 w-40" />
        <div className="relative grid gap-6 sm:grid-cols-2 sm:grid-rows-[auto_auto] sm:items-center sm:gap-x-12 sm:gap-y-16">
          <Skeleton className="h-9 w-56 max-w-full sm:col-start-1 sm:row-start-1" />
          <Skeleton className="h-11 w-32 rounded-full sm:col-start-2 sm:row-start-1 sm:justify-self-end" />
          <Skeleton className="h-5 w-96 max-w-full sm:col-start-1 sm:row-start-2" />
          <div className="grid justify-items-center gap-2.5 sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
            <Skeleton className="size-40 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <Skeleton aria-hidden className="h-10 w-80 max-w-full rounded-full" />
      <div aria-hidden className="grid gap-1 overflow-hidden rounded-3xl border bg-card/50 p-2">
        <Skeleton className="h-11 rounded-2xl" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl opacity-60" />
        ))}
      </div>
    </div>
  );
}
