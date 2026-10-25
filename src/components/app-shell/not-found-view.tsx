import { SearchXIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { StatePageShell } from "./state-page-shell";

/**
 * Landmark-free on purpose: it renders both inside the shell's `<main>` and inside the root 404's own frame.
 * Styled like the app's empty states; the shell supplies the page frame.
 */
export function NotFoundView({
  icon = SearchXIcon,
  title = "Page not found",
  description = "This page does not exist or has moved. Your lists are where you left them.",
  actionLabel = "Go to your lists",
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
}) {
  return (
    <StatePageShell>
      <EmptyState
        icon={icon}
        titleAs="h1"
        title={title}
        description={description}
        action={
          <Button asChild className="h-10 rounded-full px-5">
            <Link href="/lists">{actionLabel}</Link>
          </Button>
        }
      />
    </StatePageShell>
  );
}
