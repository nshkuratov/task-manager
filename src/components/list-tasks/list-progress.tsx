import { cn } from "cn";
import { Progress } from "@/components/ui/progress";
import type { ListCounters } from "@/contracts";
import { percentDone, progressText } from "@/lib/progress-text";

type ProgressCounts = Pick<ListCounters, "done" | "total">;

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
      <Progress
        value={percent}
        max={100}
        aria-label={`Progress of ${listName}`}
        aria-valuetext={text}
        className="bg-muted"
      />
      <p aria-hidden className="text-sm text-muted-foreground">
        {text}
      </p>
    </div>
  );
}
