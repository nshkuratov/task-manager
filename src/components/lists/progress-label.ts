import type { ListCounters } from "@/contracts/task";

/**
 * Whole percent done, floored. Computed from the integer counts: flooring `progress × 100` in floating point
 * turns 29 of 100 into 28.
 */
export function percentDone({ done, total }: Pick<ListCounters, "done" | "total">): number {
  return total === 0 ? 0 : Math.floor((done * 100) / total);
}

/** "40% done (2 of 5)"; an empty list reads "0% done (0 of 0)". */
export function progressLabel(counters: Pick<ListCounters, "done" | "total">): string {
  return `${percentDone(counters)}% done (${counters.done} of ${counters.total})`;
}
