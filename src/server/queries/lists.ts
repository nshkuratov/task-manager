import "server-only";
import type { ListSummary } from "@/contracts/task";
import { matchesListQuery, summarizeList } from "@/domain";
import type { Repositories } from "@/server/repositories";

export interface ListSummaries {
  summaries: ListSummary[];
  /** The user's list count before the query filter: tells "no lists yet" apart from "nothing matches". */
  total: number;
}

/** The signed-in user's lists, newest first, summarised for `now` and filtered by `q`. */
export async function getListSummaries(
  repos: Pick<Repositories, "lists">,
  userId: string,
  { q, now }: { q?: string | undefined; now: Date },
): Promise<ListSummaries> {
  const lists = await repos.lists.listWithTaskFacts(userId);
  const summaries = lists
    .filter(({ list }) => matchesListQuery(list.name, q ?? ""))
    .map(({ list, tasks }) => summarizeList(list, tasks, now));
  return { summaries, total: lists.length };
}
