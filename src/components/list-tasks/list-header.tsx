import { cn } from "cn";
import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
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
    <div className="grid gap-8">
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

      <div className="relative grid gap-6 sm:grid-cols-2 sm:grid-rows-[auto_auto] sm:items-center sm:gap-x-12 sm:gap-y-16">
        <h1 className="min-w-0 text-3xl font-semibold tracking-tight break-words sm:col-start-1 sm:row-start-1">
          {list.name}
        </h1>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:col-start-2 sm:row-start-1 sm:justify-self-end">
            {actions}
          </div>
        ) : null}

        <dl
          aria-label="Task counts"
          className="flex flex-wrap gap-x-10 gap-y-2 text-sm sm:col-start-1 sm:row-start-2 sm:self-end"
        >
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
            <dd className="self-center font-medium tabular-nums">{counters.overdue}</dd>
          </div>
        </dl>

        <ListProgress
          listName={list.name}
          counters={counters}
          className="sm:absolute sm:bottom-0 sm:left-1/2 sm:-translate-x-1/2"
        />
      </div>
    </div>
  );
}
