import type { ListSummary } from "@/contracts/task";
import { ListCard, LIST_ROW_COLUMNS } from "./list-card";
import type { DeleteListAction, RenameListAction } from "./types";

export function ListGrid({
  summaries,
  renameList,
  deleteList,
  query,
  timeZone,
  showTimeZone,
}: {
  summaries: readonly ListSummary[];
  renameList: RenameListAction;
  deleteList: DeleteListAction;
  query?: string | undefined;
  timeZone: string;
  showTimeZone: boolean;
}) {
  return (
    <div className="@container rounded-3xl border bg-card/50 p-3 shadow-panel backdrop-blur-sm">
      <div
        aria-hidden
        className={`hidden items-center gap-6 px-5 pt-4 pb-5 text-xs font-medium tracking-widest text-muted-foreground uppercase @min-[900px]:grid ${LIST_ROW_COLUMNS}`}
      >
        <span>Name</span>
        <span>Tasks</span>
        <span>Progress</span>
        <span>Last updated</span>
        <span className="sr-only">Actions</span>
      </div>
      <ul aria-label="Lists" className="grid gap-3">
        {summaries.map((summary) => (
          <li key={summary.list.id} data-list-id={summary.list.id}>
            <ListCard
              summary={summary}
              renameList={renameList}
              deleteList={deleteList}
              query={query}
              timeZone={timeZone}
              showTimeZone={showTimeZone}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
