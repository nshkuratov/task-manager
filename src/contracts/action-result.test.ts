// eslint-disable-next-line no-restricted-imports -- the contracts import allowlist (eslint.config.mjs) also covers tests; vitest is test-only
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toFieldErrors } from "./action-result";
import { loginSchema } from "./schemas/auth";

function errorOf(schema: z.ZodType, input: unknown): z.ZodError {
  const result = schema.safeParse(input);
  if (result.success) throw new Error("expected the parse to fail");
  return result.error;
}

describe("toFieldErrors", () => {
  it("R-DATA-2: maps field errors by top-level key and omits formError", () => {
    const failure = toFieldErrors(errorOf(loginSchema, { email: "nope", password: "" }));
    expect(failure).toEqual({
      ok: false,
      fieldErrors: { email: ["Enter a valid email address"], password: ["Enter your password"] },
    });
    expect("formError" in failure).toBe(false);
  });

  it("R-DATA-2: maps an object-level error to formError and omits fieldErrors", () => {
    const failure = toFieldErrors(errorOf(loginSchema, "not an object"));
    expect(failure).toEqual({ ok: false, formError: "Enter your email and password" });
    expect("fieldErrors" in failure).toBe(false);
  });

  it("R-DATA-2: joins several form-level errors with a space", () => {
    const schema = z.object({}).check((ctx) => {
      ctx.issues.push({ code: "custom", message: "First problem.", input: ctx.value });
      ctx.issues.push({ code: "custom", message: "Second problem.", input: ctx.value });
    });
    expect(toFieldErrors(errorOf(schema, {}))).toEqual({ ok: false, formError: "First problem. Second problem." });
  });

  it("R-DATA-2: keeps every message for a field that fails more than one check", () => {
    const schema = z.object({
      code: z.string().check((ctx) => {
        ctx.issues.push({ code: "custom", message: "Too short.", input: ctx.value });
        ctx.issues.push({ code: "custom", message: "Not a number.", input: ctx.value });
      }),
    });
    expect(toFieldErrors(errorOf(schema, { code: "x" })).fieldErrors).toEqual({
      code: ["Too short.", "Not a number."],
    });
  });
});
