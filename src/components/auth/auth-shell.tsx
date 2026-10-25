import { ListChecksIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AuthShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="grid min-h-dvh grid-rows-[minmax(3.75rem,1fr)_auto_minmax(3.75rem,1fr)] bg-background bg-app-image text-foreground">
      <header className="on-image flex items-center justify-between self-start px-4 py-3 sm:px-6">
        <p className="flex items-center gap-2 font-semibold">
          <ListChecksIcon aria-hidden className="size-5" />
          Task Manager
        </p>
        <ThemeToggle />
      </header>
      <main className="flex items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-[calc(28rem-40px)]">{children}</div>
      </main>
      <div aria-hidden="true" />
    </div>
  );
}
