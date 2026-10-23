import { Skeleton } from "@/components/ui/skeleton";

export default function ListTasksLoading() {
  return (
    <div role="status" className="grid gap-6">
      <span className="sr-only">Loading tasks…</span>
      <div aria-hidden className="grid gap-4">
        <Skeleton className="h-4 w-40" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Skeleton className="h-5 w-80 max-w-full" />
          <Skeleton className="h-2 w-64 max-w-full" />
        </div>
      </div>
      <Skeleton aria-hidden className="h-8 w-72 max-w-full" />
      <div aria-hidden className="grid gap-px overflow-hidden rounded-lg border">
        <Skeleton className="h-10 rounded-none" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-14 rounded-none opacity-60" />
        ))}
      </div>
    </div>
  );
}
