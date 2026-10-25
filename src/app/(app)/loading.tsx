import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div data-app-bg role="status" className="grid gap-6">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className="grid gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div aria-hidden className="grid gap-3 rounded-3xl border bg-card/50 p-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl opacity-70" />
        ))}
      </div>
    </div>
  );
}
