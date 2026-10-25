import { SearchXIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { StatePageShell } from "./state-page-shell";

/**
 * Landmark-free on purpose: it renders inside the `<main>` of the app frame, which the root 404 brings itself.
 * Styled like the app's empty states.
 */
export function NotFoundView({
  title = "Page not found",
  description = "This page does not exist or has moved. Your lists are where you left them.",
  actionLabel = "Go to your lists",
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
}) {
  return (
    <StatePageShell>
      <EmptyState
        icon={SearchXIcon}
        titleAs="h1"
        title={title}
        description={description}
        action={
          <Button asChild size="pill">
            <Link href="/lists">{actionLabel}</Link>
          </Button>
        }
      />
    </StatePageShell>
  );
}
