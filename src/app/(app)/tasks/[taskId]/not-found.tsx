import { NotFoundView } from "@/components/app-shell/not-found-view";
import { TASK_NOT_FOUND_DESCRIPTION } from "@/components/task-card/not-found-copy";

/** A missing task and another user's task get the same answer, so an id reveals nothing. */
export default function TaskNotFound() {
  return (
    <NotFoundView title="Task not found" description={TASK_NOT_FOUND_DESCRIPTION} actionLabel="Go to your lists" />
  );
}
