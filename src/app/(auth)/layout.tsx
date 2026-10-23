import { ListChecksIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <p className="flex items-center gap-2 font-semibold">
          <ListChecksIcon aria-hidden className="size-5" />
          Task Manager
        </p>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-[12vh] pb-12 sm:px-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
