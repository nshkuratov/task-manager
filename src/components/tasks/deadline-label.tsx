import { cn } from "cn";
import { ClockIcon, TriangleAlertIcon } from "lucide-react";
import type { TaskStatus } from "@/contracts";
import { describeDeadline } from "@/domain";
import { formatDeadline, formatRelative } from "@/lib/format-deadline";

export interface DeadlineLabelProps {
  deadline: Date | null;
  status: TaskStatus;
  /** The request's clock reading, passed down from the page; this component never reads the clock. */
  now: Date;
  locale: string;
  timeZone: string;
  /** Label the zone, for when `timeZone` is the UTC fallback rather than the viewer's own. */
  showTimeZone?: boolean;
  className?: string;
}

/** Absolute + relative deadline text ("Sat 24 Oct, 17:00 · in 5 hours"), flagged when overdue or due soon. */
export function DeadlineLabel({
  deadline,
  status,
  now,
  locale,
  timeZone,
  showTimeZone = false,
  className,
}: DeadlineLabelProps) {
  if (deadline === null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>No deadline</span>;
  }

  const description = describeDeadline(deadline, status, now);
  const relative = formatRelative(description, { locale });
  const absolute = formatDeadline(deadline, { locale, timeZone, now, showTimeZone });

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-x-1.5 text-sm",
        description.kind === "overdue" && "font-medium text-indicator-overdue-foreground",
        description.kind === "due-soon" && "text-indicator-due-soon-foreground",
        description.kind === "done" && "text-muted-foreground",
        className,
      )}
    >
      {description.kind === "overdue" ? (
        <TriangleAlertIcon role="img" aria-label="Overdue" className="size-4 shrink-0" />
      ) : null}
      {description.kind === "due-soon" ? (
        <ClockIcon role="img" aria-label="Due within 48 hours" className="size-4 shrink-0" />
      ) : null}
      <time dateTime={deadline.toISOString()}>{absolute}</time>
      {relative === null ? null : (
        <>
          <span aria-hidden>·</span>
          <span>{relative}</span>
        </>
      )}
    </span>
  );
}
