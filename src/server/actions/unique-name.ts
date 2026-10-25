import "server-only";
import type { ActionResult } from "@/contracts";
import { DuplicateNameError } from "@/server/repositories";

/**
 * Writes unless the name is taken. The pre-check gives the friendly answer; a duplicate that slips past it in a race
 * hits the unique index instead and gets the same field error rather than a crash.
 */
export async function writeUnlessNameTaken<T>(
  taken: { field: string; message: string },
  isTaken: () => Promise<boolean>,
  write: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const failure: ActionResult<T> = { ok: false, fieldErrors: { [taken.field]: [taken.message] } };
  try {
    return (await isTaken()) ? failure : await write();
  } catch (error) {
    if (error instanceof DuplicateNameError) return failure;
    throw error;
  }
}
