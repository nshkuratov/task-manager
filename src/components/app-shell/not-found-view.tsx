import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Landmark-free on purpose: it renders both inside the shell's `<main>` and inside the root 404's own frame. */
export function NotFoundView() {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-4 py-12 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        This page does not exist or has moved. Your lists are where you left them.
      </p>
      <Button asChild>
        <Link href="/lists">Go to your lists</Link>
      </Button>
    </div>
  );
}
