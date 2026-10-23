import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "List not found" };

/** Renders inside the shell's `<main>`, so it brings no landmarks of its own. */
export default function ListNotFound() {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-4 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">This list doesn’t exist or was deleted</h1>
      <p className="text-sm text-muted-foreground">It may have been removed, or the link is mistyped.</p>
      <Button asChild>
        <Link href="/lists">Back to lists</Link>
      </Button>
    </div>
  );
}
