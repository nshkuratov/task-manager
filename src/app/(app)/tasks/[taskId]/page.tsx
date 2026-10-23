import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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

/** The task card on its own: a hard load or a shared link. Soft navigation from a list opens the modal instead. */
export default async function TaskPage({ params }: PageProps<"/tasks/[taskId]">) {
  const { userId } = await requireSession();
  const { taskId } = await params;
  const [repos, timeZone] = await Promise.all([getRepositories(), getViewerTimeZone()]);
  const now = getRequestNow();
  const card = await getTaskCard(repos, userId, taskId, { now });
  if (card === null) notFound();
  const { task, listName, deadlineInfo } = card;

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Breadcrumb>
        <BreadcrumbList>
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
            <BreadcrumbPage className="break-words">{task.title}</BreadcrumbPage>
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
