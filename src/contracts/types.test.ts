import { describe, expectTypeOf, it } from "vitest";
import * as contracts from "./index";
import type {
  ActionResult,
  ChangeTaskStatusOutput,
  CreateListOutput,
  CreateTaskOutput,
  DeleteListOutput,
  DeleteTaskOutput,
  ListCounters,
  ListIndicator,
  ListsSearchParamsInput,
  ListsSearchParamsOutput,
  ListSummary,
  LoginInput,
  LoginOutput,
  RenameListOutput,
  Task,
  TaskFacts,
  TaskFieldsInput,
  TaskFieldsOutput,
  TaskList,
  TaskPriority,
  TaskStatus,
  TasksSearchParamsInput,
  TasksSearchParamsOutput,
  UpdateTaskOutput,
} from "./index";

// expect-type compares an intersection structurally different from zod's flattened object type.
type Flat<T> = { [K in keyof T]: T[K] };

type Fields = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: Date | null;
};

describe("contract shapes (checked by tsc)", () => {
  it("R-DATA-2: entity and summary types match roadmap §Contracts", () => {
    expectTypeOf<TaskStatus>().toEqualTypeOf<"new" | "in_progress" | "done">();
    expectTypeOf<TaskPriority>().toEqualTypeOf<"high" | "medium" | "low">();
    expectTypeOf(contracts.STATUS_LABELS).toEqualTypeOf<Record<TaskStatus, string>>();
    expectTypeOf(contracts.PRIORITY_LABELS).toEqualTypeOf<Record<TaskPriority, string>>();
    expectTypeOf<TaskList>().toEqualTypeOf<{ id: string; name: string; createdAt: Date; updatedAt: Date }>();
    expectTypeOf<Task>().toEqualTypeOf<{
      id: string;
      listId: string;
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      deadline: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>();
    expectTypeOf<TaskFacts>().toEqualTypeOf<{
      id: string;
      title: string;
      status: TaskStatus;
      priority: TaskPriority;
      deadline: Date | null;
    }>();
    expectTypeOf<ListCounters>().toEqualTypeOf<{
      new: number;
      inProgress: number;
      done: number;
      overdue: number;
      total: number;
    }>();
    expectTypeOf<ListIndicator>().toEqualTypeOf<"overdue" | "due-soon" | "none">();
    expectTypeOf<ListSummary>().toEqualTypeOf<{
      list: TaskList;
      counters: ListCounters;
      progress: number;
      indicator: ListIndicator;
    }>();
    expectTypeOf<typeof contracts.TIMEZONE_COOKIE>().toEqualTypeOf<"tz">();
  });

  it("R-DATA-2: ActionResult matches roadmap §Contracts", () => {
    expectTypeOf<ActionResult>().toEqualTypeOf<
      { ok: true; data: void } | { ok: false; formError?: string; fieldErrors?: Partial<Record<string, string[]>> }
    >();
    expectTypeOf<Extract<ActionResult<{ id: string }>, { ok: true }>>().toEqualTypeOf<{
      ok: true;
      data: { id: string };
    }>();
    expectTypeOf(contracts.toFieldErrors).returns.toEqualTypeOf<Extract<ActionResult<never>, { ok: false }>>();
  });

  it("R-AUTH-2: login input and output types", () => {
    expectTypeOf<LoginInput>().toEqualTypeOf<{ email: string; password: string }>();
    expectTypeOf<LoginOutput>().toEqualTypeOf<{ email: string; password: string }>();
  });

  it("R-DATA-2: list schema output types", () => {
    expectTypeOf<CreateListOutput>().toEqualTypeOf<{ name: string }>();
    expectTypeOf<RenameListOutput>().toEqualTypeOf<{ id: string; name: string }>();
    expectTypeOf<DeleteListOutput>().toEqualTypeOf<{ id: string }>();
  });

  it("R-DATA-2: forms submit raw strings; actions receive Dates and filled defaults", () => {
    expectTypeOf<TaskFieldsInput>().toEqualTypeOf<{
      title: string;
      description?: string | undefined;
      status?: TaskStatus | undefined;
      priority?: TaskPriority | undefined;
      deadline: string | null;
    }>();
    expectTypeOf<TaskFieldsOutput>().toEqualTypeOf<Fields>();
    expectTypeOf<CreateTaskOutput>().toEqualTypeOf<Flat<Fields & { listId: string }>>();
    expectTypeOf<UpdateTaskOutput>().toEqualTypeOf<Flat<Fields & { id: string }>>();
    expectTypeOf<ChangeTaskStatusOutput>().toEqualTypeOf<{ id: string; status: TaskStatus }>();
    expectTypeOf<DeleteTaskOutput>().toEqualTypeOf<{ id: string }>();
  });

  it("R-DATA-2: search params accept Next's shape and emit a key only when it is set", () => {
    expectTypeOf<ListsSearchParamsInput>().toEqualTypeOf<{ q?: string | string[] | undefined }>();
    expectTypeOf<TasksSearchParamsInput>().toEqualTypeOf<{ status?: string | string[] | undefined }>();
    expectTypeOf<ListsSearchParamsOutput>().toEqualTypeOf<{ q?: string }>();
    expectTypeOf<TasksSearchParamsOutput>().toEqualTypeOf<{ status?: TaskStatus[] }>();
  });
});
