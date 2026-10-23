import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { toFieldErrors, type ActionResult } from "@/contracts";
import { getSession } from "@/server/auth/session";
import { getRepositories, type Repositories } from "@/server/repositories";

/**
 * The arguments bound in front of the input with `.bind(null, …)`. They reach the server from the client, so
 * every element is `unknown` (one the caller left out reads as `undefined`) and the handler validates each.
 */
export type BoundArgs<B extends readonly unknown[]> = { readonly [K in keyof B]: unknown };

/** What a handler receives. */
export interface ActionContext<I, B extends readonly unknown[], U extends string | null> {
  input: I;
  userId: U;
  repos: Repositories;
  bound: BoundArgs<B>;
}

export interface ActionOptions<I, T> {
  /** Paths to revalidate after a successful run; a failed run changed nothing and revalidates nothing. */
  revalidate?: (input: I, data: T) => readonly string[];
}

/**
 * The callable Server Action. Its last argument is the input (an object, or `FormData` from a form action).
 * An action without bound arguments may be called with none at all, meaning `{}`; once arguments are bound
 * the input is required, because the runtime takes the last argument as the input.
 */
export type Action<S extends z.ZodType, T, B extends readonly unknown[]> = (
  ...args: B extends readonly [] ? [input?: z.input<S> | FormData] : [...bound: B, input: z.input<S> | FormData]
) => Promise<ActionResult<T>>;

export interface ActionRunnerDeps {
  getSession: () => Promise<{ userId: string } | null>;
  getRepositories: () => Promise<Repositories>;
  /** `revalidatePath` in the app; only callable inside a Next request. */
  revalidate: (path: string) => void;
}

// Keeps the last value of a repeated key and passes `File`s through; no current schema needs more.
const toInput = (raw: unknown): unknown => (raw instanceof FormData ? Object.fromEntries(raw) : raw);

/**
 * Builds `defineAction` over injected dependencies, so the pipeline runs in unit tests without Next.
 * Order: session (skipped for `public`) → zod `safeParse` (failure → `fieldErrors`, handler not called) →
 * handler → revalidate. Nothing is caught: redirect/notFound control flow and unexpected errors propagate
 * untouched to Next and the nearest error boundary.
 */
export function createActionRunner(deps: ActionRunnerDeps) {
  function defineAction<S extends z.ZodType, T, B extends readonly unknown[] = []>(
    schema: S,
    handler: (ctx: ActionContext<z.output<S>, B, string>) => Promise<ActionResult<T>>,
    opts?: ActionOptions<z.output<S>, T> & { public?: false },
  ): Action<S, T, B>;
  function defineAction<S extends z.ZodType, T, B extends readonly unknown[] = []>(
    schema: S,
    handler: (ctx: ActionContext<z.output<S>, B, null>) => Promise<ActionResult<T>>,
    opts: ActionOptions<z.output<S>, T> & { public: true },
  ): Action<S, T, B>;
  function defineAction<S extends z.ZodType, T, B extends readonly unknown[]>(
    schema: S,
    handler: (ctx: ActionContext<z.output<S>, B, never>) => Promise<ActionResult<T>>,
    opts: ActionOptions<z.output<S>, T> & { public?: boolean } = {},
  ): Action<S, T, B> {
    return async (...args) => {
      let userId: string | null = null;
      if (opts.public !== true) {
        const session = await deps.getSession();
        if (session === null) redirect("/login");
        userId = session.userId;
      }

      const parsed = schema.safeParse(args.length === 0 ? {} : toInput(args.at(-1)));
      if (!parsed.success) return toFieldErrors(parsed.error);

      const repos = await deps.getRepositories();
      const bound = args.slice(0, -1) as BoundArgs<B>;
      // The overloads tie `userId`'s type to `opts.public`; here it is `null` exactly when `public` is set.
      const result = await handler({ input: parsed.data, userId: userId as never, repos, bound });
      if (result.ok && opts.revalidate) {
        for (const path of opts.revalidate(parsed.data, result.data)) deps.revalidate(path);
      }
      return result;
    };
  }
  return defineAction;
}

/** Wraps a handler as a Server Action: session-checked, zod-validated, revalidating. See {@link createActionRunner}. */
export const defineAction = createActionRunner({
  getSession,
  getRepositories,
  revalidate: (path) => revalidatePath(path),
});
