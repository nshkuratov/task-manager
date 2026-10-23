import { cn } from "cn";
import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/common/page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { ListSummary } from "@/contracts";
import { ListProgress } from "./list-progress";

export interface ListHeaderProps {
  summary: ListSummary;
  /** The "Add task" control; the page supplies it with its action. */
  actions?: ReactNode;
}

/** The list page's headline: where you are, the list name, and how far along it is. */
export function ListHeader({ summary: { list, counters }, actions }: ListHeaderProps) {
  const items = [
    { label: "New", value: counters.new },
    { label: "In progress", value: counters.inProgress },
    { label: "Done", value: counters.done },
  ];

  return (
    <div className="grid gap-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/lists">Lists</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">{list.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader title={list.name} actions={actions} />

      <div className="grid gap-4 sm:grid-cols-[auto_minmax(12rem,20rem)] sm:items-end sm:justify-between">
        <dl aria-label="Task counts" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {items.map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
          <div
            className={cn(
              "flex items-baseline gap-1.5",
              counters.overdue > 0 && "font-medium text-indicator-overdue-foreground",
            )}
          >
            <dt className={cn("inline-flex items-center gap-1", counters.overdue === 0 && "text-muted-foreground")}>
              {counters.overdue > 0 ? <TriangleAlertIcon aria-hidden className="size-4 self-center" /> : null}
              Overdue
            </dt>
            <dd className="font-medium tabular-nums">{counters.overdue}</dd>
          </div>
        </dl>
        <ListProgress listName={list.name} counters={counters} />
      </div>
    </div>
  );
}
