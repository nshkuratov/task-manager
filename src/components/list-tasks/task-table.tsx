"use client";

import { cn } from "cn";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DeadlineLabel } from "@/components/tasks/deadline-label";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusSelect } from "@/components/tasks/status-select";
import { taskHref } from "@/components/tasks/task-href";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  STATUS_LABELS,
  type ActionResult,
  type ChangeTaskStatusInput,
  type DeleteTaskInput,
  type Task,
} from "@/contracts";
import { isOverdue } from "@/domain";
import { DISPLAY_LOCALE } from "@/lib/format-deadline";

export type TaskRowData = Pick<Task, "id" | "title" | "status" | "priority" | "deadline">;

export interface TaskTableProps {
  /** Already filtered and in display order (the page's query sorts them). */
  tasks: readonly TaskRowData[];
  listName: string;
  /** The request's clock reading; overdue and relative deadlines are computed against it. */
  now: Date;
  timeZone: string;
  /** Label deadlines with the zone, for when `timeZone` is the UTC fallback. */
  showTimeZone?: boolean;
  setTaskStatus: (input: ChangeTaskStatusInput) => Promise<ActionResult<unknown>>;
  deleteTask: (input: DeleteTaskInput) => Promise<ActionResult<{ listId: string }>>;
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode;
}

interface FocusedRow {
  id: string;
  index: number;
}

export function TaskTable({
  tasks,
  listName,
  now,
  timeZone,
  showTimeZone = false,
  setTaskStatus,
  deleteTask,
  empty,
}: TaskTableProps) {
  const baseId = useId();
  const titleId = (taskId: string) => `${baseId}-title-${taskId}`;
  const lastFocused = useRef<FocusedRow | null>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  const wasEmpty = useRef(tasks.length === 0);

  // Justified effect (focus management, no data): when the element holding focus unmounts — its row was
  // deleted or filtered away, or the empty state (with its Add task trigger) gave way to the first row —
  // focus would fall to <body>. Radix's own restore aims at the removed trigger, which is a no-op on a
  // detached node, so this does not fight it.
  useEffect(() => {
    const filled = wasEmpty.current && tasks.length > 0;
    wasEmpty.current = tasks.length === 0;
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;

    const first = tasks[0];
    if (filled && first !== undefined) {
      lastFocused.current = { id: first.id, index: 0 };
      document.getElementById(titleId(first.id))?.focus();
      return;
    }
    const last = lastFocused.current;
    if (last === null || tasks.some((task) => task.id === last.id)) return;

    const next = tasks[Math.min(last.index, tasks.length - 1)];
    if (next === undefined) {
      lastFocused.current = null;
      emptyRef.current?.focus();
      return;
    }
    lastFocused.current = { id: next.id, index: tasks.indexOf(next) };
    document.getElementById(titleId(next.id))?.focus();
  });

  if (tasks.length === 0) {
    return (
      <div ref={emptyRef} tabIndex={-1} className="outline-none">
        {empty}
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={`Tasks in ${listName}`}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a horizontally scrolling region must be focusable to scroll by keyboard (WCAG 2.1.1, axe scrollable-region-focusable)
      tabIndex={0}
      className="relative w-full overflow-x-auto rounded-lg border focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
    >
      <table className="w-full caption-bottom text-sm">
        <caption className="sr-only">Tasks in {listName}, sorted by urgency</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className="pl-4">
              Title
            </TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">Priority</TableHead>
            <TableHead scope="col">Deadline</TableHead>
            <TableHead scope="col" className="w-12 pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              titleId={titleId(task.id)}
              overdue={isOverdue(task, now)}
              deadline={
                <DeadlineLabel
                  deadline={task.deadline}
                  status={task.status}
                  now={now}
                  locale={DISPLAY_LOCALE}
                  timeZone={timeZone}
                  showTimeZone={showTimeZone}
                />
              }
              onFocus={() => {
                lastFocused.current = { id: task.id, index };
              }}
              setTaskStatus={setTaskStatus}
              deleteTask={deleteTask}
            />
          ))}
        </TableBody>
      </table>
    </div>
  );
}

function TaskRow({
  task,
  titleId,
  overdue,
  deadline,
  onFocus,
  setTaskStatus,
  deleteTask,
}: {
  task: TaskRowData;
  titleId: string;
  overdue: boolean;
  deadline: ReactNode;
  onFocus: () => void;
  setTaskStatus: TaskTableProps["setTaskStatus"];
  deleteTask: TaskTableProps["deleteTask"];
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const done = task.status === "done";

  return (
    <TableRow onFocus={onFocus} className={cn(overdue && "bg-indicator-overdue/40 hover:bg-indicator-overdue/50")}>
      <TableCell className="min-w-48 pl-4 whitespace-normal">
        <Link
          id={titleId}
          href={taskHref(task.id)}
          className={cn(
            "rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
            done && "font-normal text-muted-foreground",
          )}
        >
          {task.title}
        </Link>
      </TableCell>
      <TableCell>
        <StatusSelect
          status={task.status}
          title={task.title}
          onChange={async (status) => {
            const result = await setTaskStatus({ id: task.id, status });
            if (result.ok) toast.success(`“${task.title}” is now ${STATUS_LABELS[status]}`);
            return result;
          }}
        />
      </TableCell>
      <TableCell>
        <PriorityBadge priority={task.priority} />
      </TableCell>
      <TableCell>{deadline}</TableCell>
      <TableCell className="pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${task.title}`}>
              <MoreHorizontalIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={taskHref(task.id)}>
                <PencilIcon aria-hidden />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                setDeleteOpen(true);
              }}
            >
              <Trash2Icon aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DeleteTaskDialog
          title={task.title}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDelete={() => deleteTask({ id: task.id })}
          onDeleted={() => {
            toast.success(`Deleted “${task.title}”`);
          }}
        />
      </TableCell>
    </TableRow>
  );
}
