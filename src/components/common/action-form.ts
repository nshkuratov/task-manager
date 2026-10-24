import type { ActionFailure } from "@/contracts";

/** The validation timing every action-backed form shares: quiet until the first submit, then live. */
export const ACTION_FORM_OPTIONS = {
  mode: "onSubmit",
  reValidateMode: "onChange",
  shouldFocusError: true,
} as const;

export interface SplitActionErrors<F extends string> {
  /** The first message per known field, in `fields` order (so `placed[0]` is the field to focus). */
  placed: [field: F, message: string][];
  /** The form-level error plus any field message the form has no input for; `null` when there is none. */
  banner: string | null;
}

/**
 * Splits a failed action's errors into what the form can show beside an input and what it can only show in
 * its banner. A server field error the form has no input for would otherwise be lost silently.
 */
export function splitActionErrors<F extends string>(
  failure: ActionFailure,
  fields: readonly F[],
): SplitActionErrors<F> {
  const byField = failure.fieldErrors ?? {};
  const isField = (key: string): key is F => (fields as readonly string[]).includes(key);

  const placed: [F, string][] = [];
  for (const field of fields) {
    const message = byField[field]?.[0];
    if (message !== undefined) placed.push([field, message]);
  }
  const unplaced = Object.entries(byField)
    .filter(([key]) => !isField(key))
    .flatMap(([, messages]) => messages?.slice(0, 1) ?? []);
  const banner = [failure.formError, ...unplaced].filter((part) => part !== undefined).join(" ");
  return { placed, banner: banner === "" ? null : banner };
}
