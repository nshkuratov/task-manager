import { describe, expect, it } from "vitest";
import { splitActionErrors } from "./action-form";

const FIELDS = ["title", "deadline"] as const;

describe("splitActionErrors", () => {
  it("places the first message of each known field, in field order", () => {
    const result = splitActionErrors(
      { ok: false, fieldErrors: { deadline: ["Too late", "Also bad"], title: ["Required"] } },
      FIELDS,
    );
    expect(result).toEqual({
      placed: [
        ["title", "Required"],
        ["deadline", "Too late"],
      ],
      banner: null,
    });
  });

  it("puts the form error and unknown-field messages in the banner", () => {
    const result = splitActionErrors(
      { ok: false, formError: "List is gone.", fieldErrors: { listId: ["Invalid id"], title: ["Required"] } },
      FIELDS,
    );
    expect(result.placed).toEqual([["title", "Required"]]);
    expect(result.banner).toBe("List is gone. Invalid id");
  });

  it("returns nothing to show for a bare failure", () => {
    expect(splitActionErrors({ ok: false }, FIELDS)).toEqual({ placed: [], banner: null });
  });

  it("skips fields whose message list is empty", () => {
    const result = splitActionErrors({ ok: false, fieldErrors: { title: [], other: [] } }, FIELDS);
    expect(result).toEqual({ placed: [], banner: null });
  });
});
