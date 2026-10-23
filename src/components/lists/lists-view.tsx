import { PageHeader } from "@/components/common/page-header";
import type { ListSummary } from "@/contracts/task";
import { CreateListDialog } from "./create-list-dialog";
import { LISTS_HEADER_ID } from "./focus";
import { ListGrid } from "./list-grid";
import { ListsEmpty } from "./lists-empty";
import type { ListsSearchProps } from "./lists-search";
import { ListsToolbar } from "./lists-toolbar";
import type { CreateListAction, DeleteListAction, RenameListAction } from "./types";

export interface ListsViewProps extends ListsSearchProps {
  summaries: readonly ListSummary[];
  /** Every list the user has, before the search filter. */
  total: number;
  query?: string | undefined;
  createList: CreateListAction;
  renameList: RenameListAction;
  deleteList: DeleteListAction;
}

const countLabel = (n: number) => `${n} ${n === 1 ? "list" : "lists"}`;

function searchOutcome(query: string | undefined, shown: number, total: number): string {
  if (query === undefined) return "";
  if (shown === 0) return `No lists match “${query}”`;
  return `${shown} of ${countLabel(total)} ${shown === 1 ? "matches" : "match"} “${query}”`;
}

/** The body of `/lists`: data and actions arrive as props from the page. */
export function ListsView({
  summaries,
  total,
  query,
  createList,
  renameList,
  deleteList,
  onQueryChange,
}: ListsViewProps) {
  const subtitle = query === undefined ? countLabel(total) : `Showing ${summaries.length} of ${countLabel(total)}`;

  return (
    <div className="grid gap-6">
      <div id={LISTS_HEADER_ID}>
        <PageHeader title="Your lists" description={subtitle} />
      </div>
      {/* Stays mounted across searches, so the outcome of each one is announced when the new results render. */}
      <p role="status" className="sr-only">
        {searchOutcome(query, summaries.length, total)}
      </p>
      {total === 0 ? (
        <ListsEmpty kind="no-lists" action={<CreateListDialog createList={createList} />} />
      ) : (
        <>
          <ListsToolbar
            createList={createList}
            query={query}
            {...(onQueryChange === undefined ? {} : { onQueryChange })}
          />
          {summaries.length === 0 ? (
            <ListsEmpty kind="no-matches" query={query ?? ""} />
          ) : (
            <ListGrid summaries={summaries} renameList={renameList} deleteList={deleteList} query={query} />
          )}
        </>
      )}
    </div>
  );
}
