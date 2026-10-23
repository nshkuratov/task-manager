import { Skeleton } from "@/components/ui/skeleton";

export default function TaskLoading() {
  return (
    <div role="status" className="mx-auto grid max-w-2xl gap-6">
      <span className="sr-only">Loading task…</span>
      <Skeleton aria-hidden className="h-4 w-56" />
      <div aria-hidden className="grid gap-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div aria-hidden className="grid gap-5">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
