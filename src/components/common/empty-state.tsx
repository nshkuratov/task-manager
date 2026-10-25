import { cn } from "cn";
import { InboxIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  action,
  className,
  titleAs: Title = "h2",
  children,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Pages without their own heading (404, error) pass "h1"; states inside a page keep the default "h2". */
  titleAs?: "h1" | "h2";
  /** Extra content under the action (e.g. the error reference digest). */
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-3xl border bg-card/65 px-6 py-12 text-center shadow-[0_16px_48px_-24px_color-mix(in_oklab,var(--foreground)_20%,transparent)] backdrop-blur-sm",
        className,
      )}
    >
      <Icon aria-hidden className="size-10 text-muted-foreground" />
      <Title className="text-lg font-medium">{title}</Title>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
      {children}
    </div>
  );
}
