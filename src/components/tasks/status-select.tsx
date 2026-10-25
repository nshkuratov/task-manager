"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS, TASK_STATUSES, type ActionResult, type TaskStatus } from "@/contracts";

const isTaskStatus = (value: string): value is TaskStatus => (TASK_STATUSES as readonly string[]).includes(value);

export interface StatusSelectProps {
  /** The persisted status; after a successful change the revalidated page supplies the new value. */
  status: TaskStatus;
  /** The task title, used in the control's name and in the failure message. */
  title: string;
  onChange: (status: TaskStatus) => Promise<ActionResult<unknown>>;
}

/**
 * Inline status control for a table row. The chosen status shows at once and falls back to `status` when the
 * change settles: on success the server's revalidated prop already carries it; on failure it reverts and a
 * toast explains why.
 */
export function StatusSelect({ status, title, onChange }: StatusSelectProps) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();

  const change = (value: string) => {
    if (pending || !isTaskStatus(value) || value === optimistic) return;
    startTransition(async () => {
      setOptimistic(value);
      const result = await onChange(value);
      if (!result.ok) toast.error(result.formError ?? `Couldn’t change the status of “${title}”.`);
    });
  };

  return (
    <Select value={optimistic} onValueChange={change}>
      <SelectTrigger
        size="sm"
        aria-label={`Status for ${title}`}
        aria-busy={pending || undefined}
        aria-disabled={pending || undefined}
        className="min-w-32 rounded-full border-border bg-background/75 shadow-none aria-disabled:opacity-70"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent aria-label={`Status for ${title}`}>
        {TASK_STATUSES.map((value) => (
          <SelectItem key={value} value={value}>
            {STATUS_LABELS[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
