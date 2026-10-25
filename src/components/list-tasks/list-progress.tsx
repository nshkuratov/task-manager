import { cn } from "cn";
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
    <div className={cn("grid justify-items-center gap-2.5", className)}>
      <div className="relative grid size-40 place-items-center rounded-full bg-card/55 shadow-[0_14px_36px_-22px_color-mix(in_oklab,var(--foreground)_35%,transparent)]">
        <svg
          role="progressbar"
          viewBox="0 0 100 100"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={text}
          aria-label={`Progress of ${listName}`}
          className="size-32 -rotate-90"
        >
          <circle cx="50" cy="50" r="42" pathLength="100" fill="none" strokeWidth="10" className="stroke-muted" />
          {percent > 0 ? (
            <circle
              cx="50"
              cy="50"
              r="42"
              pathLength="100"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${percent} ${100 - percent}`}
              className="stroke-status-done-foreground transition-[stroke-dasharray] duration-500 motion-reduce:transition-none"
            />
          ) : null}
        </svg>
        <span aria-hidden className="absolute text-2xl font-semibold tracking-tight tabular-nums">
          {percent}%
        </span>
      </div>
      <p aria-hidden className="text-center text-sm text-muted-foreground tabular-nums">
        {text}
      </p>
    </div>
  );
}
