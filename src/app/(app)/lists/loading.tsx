import { Skeleton } from "@/components/ui/skeleton";

export default function ListsLoading() {
  return (
    <div role="status" className="grid gap-6">
      <span className="sr-only">Loading your lists…</span>
      <div aria-hidden className="grid gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div aria-hidden className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-full sm:max-w-xs" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div aria-hidden className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
