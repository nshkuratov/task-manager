import { NotFoundView } from "@/components/app-shell/not-found-view";

/** A missing task and another user's task get the same answer, so an id reveals nothing. */
export default function TaskNotFound() {
  return (
    <NotFoundView
      title="Task not found"
      description="This task doesn’t exist or was deleted."
      actionLabel="Go to your lists"
    />
  );
}
