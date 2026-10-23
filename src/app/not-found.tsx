import type { Metadata } from "next";
import { Brand } from "@/components/app-shell/brand";
import { NotFoundView } from "@/components/app-shell/not-found-view";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const metadata: Metadata = { title: "Page not found" };

/** Unmatched URLs render outside every layout but the root, so this frame supplies the header and `<main>`. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
          <Brand />
          <ThemeToggle />
        </div>
      </header>
      <main className="w-full flex-1 px-4">
        <NotFoundView />
      </main>
    </div>
  );
}
