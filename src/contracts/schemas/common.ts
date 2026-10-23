import { z } from "zod";

export const INVALID_SUBMISSION = "Something was wrong with this form. Reload the page and try again.";

/** A required, trimmed string: whitespace-only counts as empty. */
export function trimmedText(label: string, max: number) {
  return z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, { error: `${label} is required` })
    .max(max, { error: `${label} must be ${max} characters or fewer` });
}

export const listIdSchema = z.uuid({ error: "This list could not be found" });
export const taskIdSchema = z.uuid({ error: "This task could not be found" });
