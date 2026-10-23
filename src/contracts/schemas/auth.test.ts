// eslint-disable-next-line no-restricted-imports -- the contracts import allowlist (eslint.config.mjs) also covers tests; vitest is test-only
import { describe, expect, it } from "vitest";
import { loginSchema } from "./auth";

function fieldMessages(input: unknown, field: string): string[] {
  const result = loginSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.filter((issue) => issue.path[0] === field).map((issue) => issue.message);
}

describe("loginSchema", () => {
  it("R-AUTH-2: accepts the seeded credentials", () => {
    expect(loginSchema.parse({ email: "admin@example.com", password: "Admin123!" })).toEqual({
      email: "admin@example.com",
      password: "Admin123!",
    });
  });

  it("R-AUTH-2: trims and lower-cases the email before validating it", () => {
    expect(loginSchema.parse({ email: "  Admin@Example.COM ", password: "x" }).email).toBe("admin@example.com");
  });

  it.each([
    ["a malformed email", "admin@"],
    ["an email without a domain", "admin"],
    ["an empty email", ""],
    ["a whitespace-only email", "   "],
    ["a missing email", undefined],
    ["a non-string email", 42],
  ])("R-AUTH-2: rejects %s", (_label, email) => {
    expect(fieldMessages({ email, password: "x" }, "email")).toEqual(["Enter a valid email address"]);
  });

  it("R-AUTH-2: rejects an empty or missing password", () => {
    expect(fieldMessages({ email: "a@b.co", password: "" }, "password")).toEqual(["Enter your password"]);
    expect(fieldMessages({ email: "a@b.co" }, "password")).toEqual(["Enter your password"]);
  });

  it("R-AUTH-2: accepts a 200-character password and rejects 201", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "p".repeat(200) }).success).toBe(true);
    expect(fieldMessages({ email: "a@b.co", password: "p".repeat(201) }, "password")).toEqual([
      "Password must be 200 characters or fewer",
    ]);
  });

  it("R-AUTH-2: keeps spaces in a password", () => {
    expect(loginSchema.parse({ email: "a@b.co", password: " secret " }).password).toBe(" secret ");
  });

  it("R-AUTH-2: strips unknown keys", () => {
    expect(loginSchema.parse({ email: "a@b.co", password: "x", role: "admin" })).toEqual({
      email: "a@b.co",
      password: "x",
    });
  });
});
