import { z } from "zod";
import { TASK_STATUSES, type TaskStatus } from "../task";

const MAX_QUERY_LENGTH = 100;

// Next's searchParams value shape. Anything else is treated as absent, so these schemas never fail.
const rawParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .catch(undefined);

function normaliseQuery(raw: string | string[] | undefined): string | undefined {
  const first = Array.isArray(raw) ? raw[0] : raw;
  // Array.from counts code points, so truncation never splits a surrogate pair.
  const query = Array.from(first?.trim() ?? "")
    .slice(0, MAX_QUERY_LENGTH)
    .join("");
  return query === "" ? undefined : query;
}

function normaliseStatuses(raw: string | string[] | undefined): TaskStatus[] | undefined {
  const tokens = new Set(
    [raw ?? []]
      .flat()
      .flatMap((value) => value.split(","))
      .map((token) => token.trim()),
  );
  const statuses = TASK_STATUSES.filter((status) => tokens.has(status));
  return statuses.length > 0 ? statuses : undefined;
}

// The object-level transform builds a fresh object so an absent value means an absent key: zod keeps a
// present-but-undefined key, which `exactOptionalPropertyTypes` would make a different type.
export const listsSearchParamsSchema = z
  .object({ q: rawParam })
  .catch({})
  .transform(({ q }): { q?: string } => {
    const query = normaliseQuery(q);
    return query === undefined ? {} : { q: query };
  });

export const tasksSearchParamsSchema = z
  .object({ status: rawParam })
  .catch({})
  .transform(({ status }): { status?: TaskStatus[] } => {
    const statuses = normaliseStatuses(status);
    return statuses === undefined ? {} : { status: statuses };
  });

export type ListsSearchParamsInput = z.input<typeof listsSearchParamsSchema>;
export type ListsSearchParamsOutput = z.output<typeof listsSearchParamsSchema>;
export type TasksSearchParamsInput = z.input<typeof tasksSearchParamsSchema>;
export type TasksSearchParamsOutput = z.output<typeof tasksSearchParamsSchema>;
