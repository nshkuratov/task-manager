import { cn } from "cn";
import { Progress as ProgressPrimitive } from "radix-ui";
import type { ListCounters } from "@/contracts";

type ProgressCounts = Pick<ListCounters, "done" | "total">;

/**
 * Whole percent done, floored, so 100 means every task is done. Computed from the integer counts: flooring the
 * float ratio misreads exact values (29 / 100 × 100 is 28.999…).
 */
export function percentDone({ done, total }: ProgressCounts): number {
  return total === 0 ? 0 : Math.floor((done * 100) / total);
}

/** "40% done (2 of 5)". */
export function progressText(counts: ProgressCounts): string {
  return `${percentDone(counts)}% done (${counts.done} of ${counts.total})`;
}

/**
 * Built on the Radix primitive directly: the shared `ui/progress` does not forward `value` to the root, so it
 * would expose no `aria-valuenow`.
 */
export function ListProgress({
  listName,
  counters,
  className,
}: {
  listName: string;
  counters: ProgressCounts;
  className?: string;
}) {
  const percent = percentDone(counters);
  const text = progressText(counters);
  return (
    <div className={cn("grid gap-1.5", className)}>
      <ProgressPrimitive.Root
        value={percent}
        max={100}
        aria-label={`Progress of ${listName}`}
        aria-valuetext={text}
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <ProgressPrimitive.Indicator
          className="h-full w-full bg-primary transition-transform"
          style={{ transform: `translateX(-${100 - percent}%)` }}
        />
      </ProgressPrimitive.Root>
      <p aria-hidden className="text-sm text-muted-foreground">
        {text}
      </p>
    </div>
  );
}
