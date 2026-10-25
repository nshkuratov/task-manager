import { cn } from "cn";
import { ChevronsDownIcon, ChevronsUpIcon, EqualIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, type TaskPriority } from "@/contracts";

// Priority reads through colour (soft tinted fill, calm foreground) plus the icon; the border is the
// foreground at low alpha, so each badge's outline stays in its own hue.
const STYLES: Record<TaskPriority, { icon: LucideIcon; className: string }> = {
  high: { icon: ChevronsUpIcon, className: "border-priority-high-foreground/20 bg-priority-high text-priority-high-foreground" },
  medium: { icon: EqualIcon, className: "border-priority-medium-foreground/20 bg-priority-medium text-priority-medium-foreground" },
  low: { icon: ChevronsDownIcon, className: "border-priority-low-foreground/20 bg-priority-low text-priority-low-foreground" },
};

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const { icon: Icon, className: tone } = STYLES[priority];
  return (
    <Badge variant="outline" className={cn("w-24 justify-center", tone, className)}>
      <Icon aria-hidden />
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
