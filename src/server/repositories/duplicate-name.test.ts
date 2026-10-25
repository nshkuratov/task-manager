import { LibsqlError } from "@libsql/client";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { describe, expect, it } from "vitest";
import { DuplicateNameError, guardUniqueName } from "./duplicate-name";

const INDEX = "lists_user_id_name_unique";
const failing = (cause: Error) => () => Promise.reject(new DrizzleQueryError("insert into lists …", [], cause));

// Hand-built errors: the hosted (hrana) transport cannot run in-process, and the local file client is covered by
// the repository tests against a real database.
describe("guardUniqueName", () => {
  it("passes a successful write through", async () => {
    await expect(guardUniqueName(INDEX, () => Promise.resolve("row"))).resolves.toBe("row");
  });

  it("maps the local client's violation of the index", async () => {
    const local = new LibsqlError(
      `SQLITE_CONSTRAINT_UNIQUE: UNIQUE constraint failed: index '${INDEX}'`,
      "SQLITE_CONSTRAINT",
      "SQLITE_CONSTRAINT_UNIQUE",
      2067,
    );
    await expect(guardUniqueName(INDEX, failing(local))).rejects.toBeInstanceOf(DuplicateNameError);
  });

  it("maps the hosted client's violation, which carries no extended code", async () => {
    const hosted = new LibsqlError(
      `SQLite error: UNIQUE constraint failed: index '${INDEX}'`,
      "SQLITE_CONSTRAINT",
      undefined,
    );
    await expect(guardUniqueName(INDEX, failing(hosted))).rejects.toBeInstanceOf(DuplicateNameError);
  });

  it("rethrows a violation of another index, other constraints and other errors unchanged", async () => {
    const otherIndex = new LibsqlError("UNIQUE constraint failed: index 'other'", "SQLITE_CONSTRAINT");
    const foreignKey = new LibsqlError("FOREIGN KEY constraint failed", "SQLITE_CONSTRAINT");
    const busy = new LibsqlError("database is locked", "SQLITE_BUSY");
    for (const cause of [otherIndex, foreignKey, busy]) {
      await expect(guardUniqueName(INDEX, failing(cause))).rejects.toBeInstanceOf(DrizzleQueryError);
    }
    const plain = new Error("network down");
    await expect(guardUniqueName(INDEX, () => Promise.reject(plain))).rejects.toBe(plain);
  });
});
