import type { Metadata } from "next";
import { ListsView } from "@/components/lists/lists-view";
import { listsSearchParamsSchema } from "@/contracts";
import { createList, deleteList, renameList } from "@/server/actions/lists";
import { requireSession } from "@/server/auth/session";
import { getListSummaries } from "@/server/queries/lists";
import { getRepositories } from "@/server/repositories";
import { FALLBACK_TIME_ZONE, getRequestNow, getViewerTimeZone } from "@/server/request";

export const metadata: Metadata = { title: "Your lists" };

export default async function ListsPage({ searchParams }: PageProps<"/lists">) {
  const { userId } = await requireSession();
  const parsed = listsSearchParamsSchema.safeParse(await searchParams);
  const q = parsed.success ? parsed.data.q : undefined;
  const [repos, timeZone] = await Promise.all([getRepositories(), getViewerTimeZone()]);
  const { summaries, total } = await getListSummaries(repos, userId, { q, now: getRequestNow() });

  return (
    <ListsView
      summaries={summaries}
      total={total}
      query={q}
      createList={createList}
      renameList={renameList}
      deleteList={deleteList}
      timeZone={timeZone}
      showTimeZone={timeZone === FALLBACK_TIME_ZONE}
    />
  );
}
