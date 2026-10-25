import type { ReactNode } from "react";
import { MAIN_CONTENT_ID, SkipLink } from "./skip-link";

/** The app's page frame: background image, header, and the scrolling area holding the page's one `main`. */
export function AppFrame({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background bg-app-image text-foreground">
      <SkipLink />
      {header}
      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 scroll-mt-14 px-4 py-6 outline-none has-[[data-wide-page]]:max-w-[90rem] sm:px-6 sm:py-8 lg:px-[60px]"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
