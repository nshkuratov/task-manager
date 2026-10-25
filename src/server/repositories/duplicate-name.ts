import "server-only";
import { LibsqlError } from "@libsql/client";
import { DrizzleQueryError } from "drizzle-orm/errors";

/** A write hit the unique name index: a duplicate that passed the pre-check in a race. */
export class DuplicateNameError extends Error {
  constructor(readonly index: string) {
    super(`Duplicate name rejected by unique index ${index}`);
    this.name = "DuplicateNameError";
  }
}

/**
 * The comparison key for "same name". Computed in JS because SQLite's built-in `lower()` folds ASCII only, so
 * `lower('Покупки')` stays `Покупки` and a SQL comparison would miss non-ASCII duplicates.
 */
export const nameKey = (value: string): string => value.normalize("NFC").toLowerCase();

/**
 * Runs a write, turning a violation of `index` into `DuplicateNameError`; every other error propagates as is.
 * Matched on the code and message, not `extendedCode`: the hosted (hrana) client never sets the extended code.
 */
export async function guardUniqueName<T>(index: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (
      error instanceof DrizzleQueryError &&
      error.cause instanceof LibsqlError &&
      error.cause.code === "SQLITE_CONSTRAINT" &&
      error.cause.message.includes(`UNIQUE constraint failed: index '${index}'`)
    ) {
      throw new DuplicateNameError(index);
    }
    throw error;
  }
}
