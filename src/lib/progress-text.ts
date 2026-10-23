import type { ListCounters } from "@/contracts/task";

type ProgressCounts = Pick<ListCounters, "done" | "total">;

/**
 * Whole percent done, floored, so 100 means every task is done. Computed from the integer counts: flooring the
 * float ratio misreads exact values (29 / 100 × 100 is 28.999…).
 */
export function percentDone({ done, total }: ProgressCounts): number {
  return total === 0 ? 0 : Math.floor((done * 100) / total);
}

/** "40% done (2 of 5)"; an empty list reads "0% done (0 of 0)". */
export function progressText(counts: ProgressCounts): string {
  return `${percentDone(counts)}% done (${counts.done} of ${counts.total})`;
}
