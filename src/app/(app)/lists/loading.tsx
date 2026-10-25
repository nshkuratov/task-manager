import { Skeleton } from "@/components/ui/skeleton";

export default function ListsLoading() {
  return (
    <div data-wide-page data-app-bg role="status" className="grid gap-6">
      <span className="sr-only">Loading your lists…</span>
      <div aria-hidden className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-full rounded-full sm:max-w-xs" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div aria-hidden className="grid gap-3 rounded-3xl border bg-card/50 p-3">
        <Skeleton className="hidden h-12 w-full rounded-xl lg:block" />
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-3xl lg:h-28" />
        ))}
      </div>
    </div>
  );
}
