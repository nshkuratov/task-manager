import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import type { ListCounters, ListSummary } from "@/contracts/task";
import { percentDone, progressText } from "@/lib/progress-text";
import { listLinkId } from "./focus";
import { ListCardMenu } from "./list-card-menu";
import { ListIndicator } from "./list-indicator";
import { ListUpdatedAt } from "./list-updated-at";
import type { DeleteListAction, RenameListAction } from "./types";

const COUNTERS: ReadonlyArray<[keyof Omit<ListCounters, "total">, string]> = [
  ["new", "New"],
  ["inProgress", "In progress"],
  ["done", "Done"],
  ["overdue", "Overdue"],
];

export const LIST_ROW_COLUMNS =
  "@min-[900px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,0.85fr)_2.25rem]";

export interface ListCardProps {
  summary: ListSummary;
  renameList: RenameListAction;
  deleteList: DeleteListAction;
  query?: string | undefined;
}

/** Only the list name navigates; the card surface and actions remain independent pointer targets. */
export function ListCard({ summary: { list, counters, indicator }, renameList, deleteList, query }: ListCardProps) {
  const label = progressText(counters);
  return (
    <div
      className={`relative grid items-center gap-5 rounded-3xl border bg-card/65 p-5 text-card-foreground shadow-[0_8px_24px_-16px_color-mix(in_oklab,var(--foreground)_16%,transparent)] @min-[900px]:min-h-28 @min-[900px]:gap-6 ${LIST_ROW_COLUMNS}`}
    >
      <div className="grid min-w-0 gap-2 pr-12 @min-[900px]:pr-0">
        <h2
          title={list.name}
          className="truncate text-lg leading-snug font-medium @min-[1100px]:text-xl"
        >
          <Link
            id={listLinkId(list.id)}
            href={`/lists/${list.id}`}
            className="block max-w-full truncate rounded-sm text-foreground/85 underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          >
            {list.name}
          </Link>
        </h2>
        <ListIndicator indicator={indicator} overdue={counters.overdue} />
      </div>
      <dl className="grid min-w-0 grid-cols-4 divide-x divide-border">
        {COUNTERS.map(([key, name]) => (
          <div key={key} className="flex min-w-0 flex-col-reverse gap-1 px-2 first:pl-0 last:pr-0 @min-[1100px]:px-4">
            <dt className="text-xs whitespace-nowrap text-muted-foreground">{name}</dt>
            <dd className="text-xl font-normal tabular-nums">{counters[key]}</dd>
          </div>
        ))}
      </dl>
      <div className="grid min-w-0 gap-2">
        <Progress
          value={percentDone(counters)}
          max={100}
          aria-label={`Progress of “${list.name}”`}
          aria-valuetext={label}
          className="h-3.5 bg-muted [&>[data-slot=progress-indicator]]:rounded-full [&>[data-slot=progress-indicator]]:bg-status-done-foreground"
        />
        <p aria-hidden className="text-sm text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="text-sm text-muted-foreground">
        <span className="mr-2 @min-[900px]:sr-only">Last updated</span>
        <ListUpdatedAt date={list.updatedAt} />
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-1 @min-[900px]:static">
        <div className="relative z-10">
          <ListCardMenu
            list={list}
            taskCount={counters.total}
            renameList={renameList}
            deleteList={deleteList}
            query={query}
          />
        </div>
      </div>
    </div>
  );
}
