import { cn } from "cn";
import { CircleCheckIcon, CircleDotIcon, CircleIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type TaskStatus } from "@/contracts";

const STYLES: Record<TaskStatus, { icon: LucideIcon; className: string }> = {
  new: { icon: CircleIcon, className: "bg-status-new text-status-new-foreground" },
  in_progress: { icon: CircleDotIcon, className: "bg-status-in-progress text-status-in-progress-foreground" },
  done: { icon: CircleCheckIcon, className: "bg-status-done text-status-done-foreground" },
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const { icon: Icon, className: tone } = STYLES[status];
  return (
    <Badge variant="secondary" className={cn(tone, className)}>
      <Icon aria-hidden />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
