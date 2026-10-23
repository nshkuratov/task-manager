import type { Metadata } from "next";
import { NotFoundView } from "@/components/app-shell/not-found-view";

export const metadata: Metadata = { title: "Page not found" };

/** `notFound()` under the shell renders here, inside the shell's `<main>`, so it brings no frame of its own. */
export default function AppNotFound() {
  return <NotFoundView />;
}
