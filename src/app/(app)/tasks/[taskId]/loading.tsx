import { Skeleton } from "@/components/ui/skeleton";

export default function TaskLoading() {
  return (
    <div data-app-bg role="status" className="mx-auto grid max-w-3xl gap-5 pb-8 sm:pb-10">
      <span className="sr-only">Loading task…</span>
      <Skeleton aria-hidden className="h-4 w-56" />
      <div
        aria-hidden
        className="grid gap-6 rounded-3xl border bg-card/70 p-6 shadow-[0_16px_48px_-24px_color-mix(in_oklab,var(--foreground)_20%,transparent)] backdrop-blur-sm sm:p-8"
      >
        <div className="grid gap-2">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid w-full max-w-sm gap-2 rounded-2xl bg-muted/40 p-4">
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
