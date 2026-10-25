"use client";

import { cn } from "cn";
import { ClockIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { TaskForm, taskToFormValues } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import type { ActionResult, DeleteTaskInput, Task, TaskFieldsInput, UpdateTaskInput } from "@/contracts";
import type { DeadlineDescription } from "@/domain";
import { DISPLAY_LOCALE, formatDeadline, formatRelative } from "@/lib/format-deadline";
import { TASK_CARD_PANEL, TASK_METADATA_BOX } from "./layout";

export interface TaskCardProps {
  task: Task;
  listName: string;
  /** `describeDeadline` for the request's `now`, from the page's query. */
  deadlineInfo: DeadlineDescription;
  /** The viewer's IANA zone (`getViewerTimeZone()`), so the server and the browser format identically. */
  timeZone: string;
  /** The request's clock reading; decides whether dates show their year. */
  now: Date;
  /** Label the zone, for when `timeZone` is the UTC fallback rather than the viewer's own. */
  showTimeZone?: boolean;
  /** The `updateTask` action; the card adds the task id. */
  onSave: (input: UpdateTaskInput) => Promise<ActionResult<unknown>>;
  /** The `deleteTask` action; the card adds the task id. */
  onDelete: (input: DeleteTaskInput) => Promise<ActionResult<{ listId: string }>>;
  /**
   * `"page"`: the standalone card, with the title as the view's `h1` and Delete beside "Save changes".
   * `"none"`: hosted by a dialog, which titles it and passes `formCancel` instead.
   */
  headline?: "page" | "none";
  /** After the "Task saved" toast. */
  onSaved?: () => void;
  /** After the delete toast. Defaults to replacing the URL with the task's list, so Back skips the dead card. */
  onDeleted?: (listId: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** The dialog's Cancel, rendered by the form next to "Save changes"; the full-page card has none. */
  formCancel?: ReactNode;
  /**
   * Called synchronously when a save starts and when it settles. Not React state: the form saves inside a
   * transition, so a state update made there would not commit until the save had already finished.
   */
  onSavingChange?: (saving: boolean) => void;
}

/** The reader-facing urgency line: "2 days overdue", "in 5 hours", "No deadline", or "Done". */
function DeadlineSummary({ deadlineInfo, className }: { deadlineInfo: DeadlineDescription; className?: string }) {
  const text = formatRelative(deadlineInfo, { locale: DISPLAY_LOCALE }) ?? "Done";
  const { kind } = deadlineInfo;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        kind === "overdue" && "font-medium text-indicator-overdue-foreground",
        kind === "due-soon" && "text-indicator-due-soon-foreground",
        kind === "done" && "text-muted-foreground",
        className,
      )}
    >
      {kind === "overdue" ? <TriangleAlertIcon role="img" aria-label="Overdue" className="size-4 shrink-0" /> : null}
      {kind === "due-soon" ? (
        <ClockIcon role="img" aria-label="Due within 48 hours" className="size-4 shrink-0" />
      ) : null}
      {text}
    </span>
  );
}

export function TaskCard({
  task,
  listName,
  deadlineInfo,
  timeZone,
  now,
  showTimeZone = false,
  onSave,
  onDelete,
  headline = "page",
  onSaved,
  onDeleted,
  onDirtyChange,
  onSavingChange,
  formCancel,
}: TaskCardProps) {
  const router = useRouter();

  const save = useCallback(
    async (values: TaskFieldsInput) => {
      onSavingChange?.(true);
      try {
        return await onSave({ ...values, id: task.id });
      } finally {
        onSavingChange?.(false);
      }
    },
    [onSave, onSavingChange, task.id],
  );

  const formatInstant = (date: Date) => formatDeadline(date, { locale: DISPLAY_LOCALE, timeZone, now, showTimeZone });
  const isStandalonePage = headline === "page";
  const secondaryAction = isStandalonePage ? (
    <DeleteTaskDialog
      title={task.title}
      onDelete={() => onDelete({ id: task.id })}
      onDeleted={(listId) => {
        toast.success(`Deleted “${task.title}”`);
        if (onDeleted) onDeleted(listId);
        else router.replace(`/lists/${listId}`);
      }}
      trigger={
        <Button variant="outline" size="pill" className="text-destructive">
          <Trash2Icon aria-hidden />
          Delete task
        </Button>
      }
    />
  ) : (
    formCancel
  );

  return (
    <div className={cn("grid gap-6", isStandalonePage && TASK_CARD_PANEL)}>
      {isStandalonePage ? (
        <PageHeader title={task.title} description={<DeadlineSummary deadlineInfo={deadlineInfo} />} />
      ) : null}

      <dl className={cn("grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm", isStandalonePage && TASK_METADATA_BOX)}>
        <dt className="text-muted-foreground">List</dt>
        <dd className="min-w-0 break-words">
          <Link href={`/lists/${task.listId}`} className="font-medium underline-offset-4 hover:underline">
            {listName}
          </Link>
        </dd>
        <dt className="text-muted-foreground">Created</dt>
        <dd>
          <time dateTime={task.createdAt.toISOString()}>{formatInstant(task.createdAt)}</time>
        </dd>
        <dt className="text-muted-foreground">Updated</dt>
        <dd>
          <time dateTime={task.updatedAt.toISOString()}>{formatInstant(task.updatedAt)}</time>
        </dd>
      </dl>

      <TaskForm
        mode="edit"
        timeZone={timeZone}
        defaultValues={taskToFormValues(task, timeZone)}
        onSubmit={save}
        onSuccess={() => {
          toast.success("Task saved");
          onSaved?.();
        }}
        {...(onDirtyChange === undefined ? {} : { onDirtyChange })}
        {...(secondaryAction === undefined ? {} : { cancel: secondaryAction })}
        spreadActions={isStandalonePage}
      />
    </div>
  );
}
