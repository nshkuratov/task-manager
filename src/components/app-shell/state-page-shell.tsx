import type { ReactNode } from "react";

/**
 * Centers a standalone state (404, error) on the page. `data-app-bg` turns on the shell's background image,
 * `data-wide-page` widens the shell's header and main to match the app's other pages.
 */
export function StatePageShell({ children }: { children: ReactNode }) {
  return (
    <div data-app-bg data-wide-page className="mx-auto max-w-xl py-12">
      {children}
    </div>
  );
}
