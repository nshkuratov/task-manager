import type { ListSummary } from "@/contracts/task";
import { ListCard } from "./list-card";
import type { DeleteListAction, RenameListAction } from "./types";

export function ListGrid({
  summaries,
  renameList,
  deleteList,
  query,
}: {
  summaries: readonly ListSummary[];
  renameList: RenameListAction;
  deleteList: DeleteListAction;
  query?: string | undefined;
}) {
  return (
    <ul aria-label="Lists" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {summaries.map((summary) => (
        <li key={summary.list.id} data-list-id={summary.list.id}>
          <ListCard summary={summary} renameList={renameList} deleteList={deleteList} query={query} />
        </li>
      ))}
    </ul>
  );
}
