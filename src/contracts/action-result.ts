import { z } from "zod";

export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; formError?: string; fieldErrors?: Partial<Record<string, string[]>> };

export type ActionFailure = Extract<ActionResult<never>, { ok: false }>;

/** Maps a failed parse of a flat schema to the failure shape forms render. */
export function toFieldErrors(error: z.ZodError): ActionFailure {
  const { formErrors, fieldErrors } = z.flattenError(error);
  const byField: Partial<Record<string, string[]>> = fieldErrors;
  const failure: ActionFailure = { ok: false };
  if (formErrors.length > 0) failure.formError = formErrors.join(" ");
  if (Object.keys(byField).length > 0) failure.fieldErrors = byField;
  return failure;
}
