import { ClockIcon, TriangleAlertIcon } from "lucide-react";
import type { ListIndicator as Indicator } from "@/contracts/task";

/** Red beats yellow (the domain decides which); colour is backed by an icon and text. */
export function ListIndicator({ indicator, overdue }: { indicator: Indicator; overdue: number }) {
  if (indicator === "none") return null;
  if (indicator === "overdue") {
    return (
      <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-indicator-overdue px-2.5 py-0.5 text-xs font-medium text-indicator-overdue-foreground">
        <TriangleAlertIcon aria-hidden className="size-3.5" />
        {overdue} overdue
      </p>
    );
  }
  return (
    <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-indicator-due-soon px-2.5 py-0.5 text-xs font-medium text-indicator-due-soon-foreground">
      <ClockIcon aria-hidden className="size-3.5" />
      Due within 48 hours
    </p>
  );
}
