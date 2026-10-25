import type { Metadata } from "next";
import { NotFoundView } from "@/components/app-shell/not-found-view";

export const metadata: Metadata = { title: "List not found" };

/** Renders inside the shell's `<main>`, so it brings no landmarks of its own. */
export default function ListNotFound() {
  return (
    <NotFoundView
      title="This list doesn’t exist or was deleted"
      description="It may have been removed, or the link is mistyped."
      actionLabel="Back to lists"
    />
  );
}
