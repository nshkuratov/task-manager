import { CreateListDialog } from "./create-list-dialog";
import { ListsSearch, type ListsSearchProps } from "./lists-search";
import type { CreateListAction } from "./types";

export function ListsToolbar({
  createList,
  query,
  onQueryChange,
}: {
  createList: CreateListAction;
  query?: string | undefined;
} & ListsSearchProps) {
  return (
    <div className="on-image flex flex-wrap items-center justify-between gap-3">
      <ListsSearch {...(onQueryChange === undefined ? {} : { onQueryChange })} />
      <CreateListDialog createList={createList} query={query} />
    </div>
  );
}
