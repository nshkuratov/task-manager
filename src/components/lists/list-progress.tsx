"use client";

import { Progress as ProgressPrimitive } from "radix-ui";

/**
 * The list's progress bar. Built on the Radix primitive directly: the shadcn `Progress` in `ui/` does not
 * forward `value` to the Root, which leaves the bar indeterminate (no `aria-valuenow` / `aria-valuetext`).
 */
export function ListProgress({ value, label, valueText }: { value: number; label: string; valueText: string }) {
  return (
    <ProgressPrimitive.Root
      value={value}
      max={100}
      getValueLabel={() => valueText}
      aria-label={label}
      className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20"
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full bg-primary transition-transform motion-reduce:transition-none"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
