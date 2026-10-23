import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "./password";

describe("verifyPassword", () => {
  it("accepts the right password and rejects a wrong one", async () => {
    const hash = await bcrypt.hash("correct horse", 4);
    await expect(verifyPassword("correct horse", hash)).resolves.toBe(true);
    await expect(verifyPassword("correct horsE", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("rejects everything against the dummy hash, at the full cost of 12", async () => {
    expect(bcrypt.getRounds(DUMMY_PASSWORD_HASH)).toBe(12);
    for (const password of ["", "Admin123!", "unused", "password"]) {
      await expect(verifyPassword(password, DUMMY_PASSWORD_HASH)).resolves.toBe(false);
    }
  });
});
