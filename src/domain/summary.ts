import type { ListSummary, TaskFacts, TaskList } from "@/contracts/task";
import { countTasks, progressOf } from "./counters";
import { indicatorOf } from "./indicator";

/** Everything a list card shows; boundaries are those of {@link countTasks} and {@link indicatorOf}. */
export function summarizeList(list: TaskList, tasks: readonly TaskFacts[], now: Date): ListSummary {
  const counters = countTasks(tasks, now);
  return { list, counters, progress: progressOf(counters), indicator: indicatorOf(tasks, now) };
}
