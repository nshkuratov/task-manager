import { notFound } from "next/navigation";
import { TaskCardDialog } from "@/components/task-card/task-card-dialog";
import { deleteTask, updateTask } from "@/server/actions/tasks";
import { requireSession } from "@/server/auth/session";
import { getTaskCard } from "@/server/queries/task-card";
import { getRepositories } from "@/server/repositories";
import { FALLBACK_TIME_ZONE, getRequestNow, getViewerTimeZone } from "@/server/request";

/** `/tasks/<id>` reached by soft navigation from a list: the card as a dialog over that list. */
export default async function InterceptedTaskPage({ params }: PageProps<"/tasks/[taskId]">) {
  const { userId } = await requireSession();
  const { taskId } = await params;
  const [repos, timeZone] = await Promise.all([getRepositories(), getViewerTimeZone()]);
  const now = getRequestNow();
  const card = await getTaskCard(repos, userId, taskId, { now });
  if (card === null) notFound();

  return (
    <TaskCardDialog
      task={card.task}
      listName={card.listName}
      deadlineInfo={card.deadlineInfo}
      timeZone={timeZone}
      now={now}
      showTimeZone={timeZone === FALLBACK_TIME_ZONE}
      onSave={updateTask}
      onDelete={deleteTask}
    />
  );
}
