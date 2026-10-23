import { cn } from "cn";
import { ChevronsDownIcon, ChevronsUpIcon, EqualIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, type TaskPriority } from "@/contracts";

// There are no priority colour tokens (red and amber already mean overdue and due soon), so the level is
// carried by the icon, the text and the weight.
const STYLES: Record<TaskPriority, { icon: LucideIcon; className: string }> = {
  high: { icon: ChevronsUpIcon, className: "border-input font-semibold text-foreground" },
  medium: { icon: EqualIcon, className: "border-input text-foreground" },
  low: { icon: ChevronsDownIcon, className: "border-input text-muted-foreground" },
};

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const { icon: Icon, className: tone } = STYLES[priority];
  return (
    <Badge variant="outline" className={cn(tone, className)}>
      <Icon aria-hidden />
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
