/** The shell's `<main>` must carry this id and `tabIndex={-1}`, or activating the link moves no focus. */
export const MAIN_CONTENT_ID = "main";

/** A plain anchor on purpose: the browser's own in-page navigation moves focus to the `tabIndex={-1}` target. */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only rounded-full bg-background text-sm font-medium text-foreground shadow-md outline-none focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      Skip to content
    </a>
  );
}
