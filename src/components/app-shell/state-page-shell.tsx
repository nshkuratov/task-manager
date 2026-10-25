import type { ReactNode } from "react";

/** Centers a standalone state (404, error) on the page; `data-wide-page` widens the frame like the app's other pages. */
export function StatePageShell({ children }: { children: ReactNode }) {
  return (
    <div data-wide-page className="mx-auto max-w-xl py-12">
      {children}
    </div>
  );
}
