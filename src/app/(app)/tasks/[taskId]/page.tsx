import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TASK_PAGE_FRAME } from "@/components/task-card/layout";
import { TaskCard } from "@/components/task-card/task-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { deleteTask, updateTask } from "@/server/actions/tasks";
import { requireSession } from "@/server/auth/session";
import { getTaskCard } from "@/server/queries/task-card";
import { getRepositories } from "@/server/repositories";
import { FALLBACK_TIME_ZONE, getRequestNow, getViewerTimeZone } from "@/server/request";

export const metadata: Metadata = { title: "Task" };

/** The standalone task page opened from its title or a shared/direct link. The row's Edit action opens the modal. */
export default async function TaskPage({ params }: PageProps<"/tasks/[taskId]">) {
  const { userId } = await requireSession();
  const { taskId } = await params;
  const [repos, timeZone] = await Promise.all([getRepositories(), getViewerTimeZone()]);
  const now = getRequestNow();
  const card = await getTaskCard(repos, userId, taskId, { now });
  if (card === null) notFound();
  const { task, listName, deadlineInfo } = card;

  return (
    <div className={TASK_PAGE_FRAME}>
      <Breadcrumb className="on-image">
        <BreadcrumbList className="min-w-0 flex-nowrap">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/lists">Lists</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbLink asChild>
              <Link href={`/lists/${task.listId}`} className="break-words">
                {listName}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="block max-w-64 truncate" title={task.title}>
              {task.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <TaskCard
        task={task}
        listName={listName}
        deadlineInfo={deadlineInfo}
        timeZone={timeZone}
        now={now}
        showTimeZone={timeZone === FALLBACK_TIME_ZONE}
        onSave={updateTask}
        onDelete={deleteTask}
      />
    </div>
  );
}
