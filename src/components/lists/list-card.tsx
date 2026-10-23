import { cn } from "cn";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ListCounters, ListSummary } from "@/contracts/task";
import { percentDone, progressText } from "@/lib/progress-text";
import { listLinkId } from "./focus";
import { ListCardMenu } from "./list-card-menu";
import { ListIndicator } from "./list-indicator";
import type { DeleteListAction, RenameListAction } from "./types";

const COUNTERS: ReadonlyArray<[keyof Omit<ListCounters, "total">, string]> = [
  ["new", "New"],
  ["inProgress", "In progress"],
  ["done", "Done"],
  ["overdue", "Overdue"],
];

const ACCENT = {
  overdue: "border-l-indicator-overdue-foreground",
  "due-soon": "border-l-indicator-due-soon-foreground",
  none: "border-l-border",
} as const;

export interface ListCardProps {
  summary: ListSummary;
  renameList: RenameListAction;
  deleteList: DeleteListAction;
  query?: string | undefined;
}

/**
 * One list at a glance. The name's link is stretched over the whole card; the actions menu sits above that
 * overlay and outside the link, so it stays a separate tab stop and click target.
 */
export function ListCard({ summary: { list, counters, indicator }, renameList, deleteList, query }: ListCardProps) {
  const label = progressText(counters);

  return (
    <Card className={cn("relative h-full gap-4 border-l-4 py-5 transition-shadow hover:shadow-md", ACCENT[indicator])}>
      <div className="flex items-start justify-between gap-2 pr-3 pl-5">
        <h2 className="min-w-0 pt-1.5 text-base leading-snug font-semibold break-words">
          <Link
            id={listLinkId(list.id)}
            href={`/lists/${list.id}`}
            className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
          >
            {list.name}
          </Link>
        </h2>
        <div className="relative z-10 shrink-0">
          <ListCardMenu
            list={list}
            taskCount={counters.total}
            renameList={renameList}
            deleteList={deleteList}
            query={query}
          />
        </div>
      </div>

      <div className="min-h-6 px-5">
        <ListIndicator indicator={indicator} overdue={counters.overdue} />
      </div>

      <dl className="grid grid-cols-4 gap-2 px-5">
        {COUNTERS.map(([key, name]) => (
          <div key={key} className="flex flex-col-reverse gap-0.5">
            <dt className="text-xs text-muted-foreground">{name}</dt>
            <dd className="text-lg font-semibold tabular-nums">{counters[key]}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto grid gap-1.5 px-5">
        <Progress
          value={percentDone(counters)}
          max={100}
          aria-label={`Progress of “${list.name}”`}
          aria-valuetext={label}
        />
        {/* The progressbar announces the same text; this copy is for sighted readers. */}
        <p aria-hidden className="text-xs text-muted-foreground">
          {label}
        </p>
      </div>
    </Card>
  );
}
