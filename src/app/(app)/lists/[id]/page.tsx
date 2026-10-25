import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddTaskDialog } from "@/components/list-tasks/add-task-dialog";
import { ListHeader } from "@/components/list-tasks/list-header";
import { StatusFilter } from "@/components/list-tasks/status-filter";
import { TaskTable } from "@/components/list-tasks/task-table";
import { TasksEmpty } from "@/components/list-tasks/tasks-empty";
import { tasksSearchParamsSchema } from "@/contracts";
import { listIdSchema } from "@/contracts/schemas/common";
import { createTask, deleteTask, setTaskStatus } from "@/server/actions/tasks";
import { requireSession } from "@/server/auth/session";
import { getListWithTasks } from "@/server/queries/list-tasks";
import { getRepositories } from "@/server/repositories";
import { FALLBACK_TIME_ZONE, getRequestNow, getViewerTimeZone } from "@/server/request";

export async function generateMetadata({ params }: PageProps<"/lists/[id]">): Promise<Metadata> {
  const { userId } = await requireSession();
  const id = listIdSchema.safeParse((await params).id);
  const list = id.success ? await (await getRepositories()).lists.get(userId, id.data) : null;
  return { title: list?.name ?? "List not found" };
}

export default async function ListTasksPage({ params, searchParams }: PageProps<"/lists/[id]">) {
  const { userId } = await requireSession();
  const id = listIdSchema.safeParse((await params).id);
  if (!id.success) notFound();

  const filter = tasksSearchParamsSchema.safeParse(await searchParams);
  const statuses = filter.success ? (filter.data.status ?? []) : [];
  const now = getRequestNow();
  const timeZone = await getViewerTimeZone();

  const data = await getListWithTasks(await getRepositories(), userId, id.data, { statuses, now });
  if (data === null) notFound();
  const { list, summary, tasks, totalUnfiltered, countsByStatus } = data;

  const addTask = <AddTaskDialog listId={list.id} timeZone={timeZone} createTask={createTask} />;

  return (
    <div data-app-bg data-wide-page className="grid gap-6 pb-12">
      <ListHeader summary={summary} actions={totalUnfiltered > 0 ? addTask : undefined} />
      {totalUnfiltered > 0 ? <StatusFilter selected={statuses} counts={countsByStatus} /> : null}
      <TaskTable
        tasks={tasks.map(({ id, title, status, priority, deadline }) => ({ id, title, status, priority, deadline }))}
        listName={list.name}
        now={now}
        timeZone={timeZone}
        showTimeZone={timeZone === FALLBACK_TIME_ZONE}
        setTaskStatus={setTaskStatus}
        deleteTask={deleteTask}
        empty={
          totalUnfiltered === 0 ? (
            <TasksEmpty variant="empty" action={addTask} />
          ) : (
            <TasksEmpty variant="filtered" statuses={statuses} />
          )
        }
      />
    </div>
  );
}
