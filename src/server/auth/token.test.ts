import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "./token";

const SECRET = "a-test-secret-that-is-at-least-32-characters-long";
const USER_ID = "6f1c1f5e-2a4b-4c1e-9d55-1f0a3c2b7e10";
const NOW = new Date("2026-10-22T10:00:00Z");
const at = (secondsFromNow: number) => new Date(NOW.getTime() + secondsFromNow * 1000);

describe("session token", () => {
  it("R-AUTH-4: a signed token verifies back to its user", async () => {
    const token = await signSessionToken(USER_ID, SECRET, NOW);
    await expect(verifySessionToken(token, SECRET, { currentDate: NOW })).resolves.toEqual({ userId: USER_ID });
  });

  it("is valid until its expiry and rejected one second after it", async () => {
    const token = await signSessionToken(USER_ID, SECRET, NOW);
    await expect(verifySessionToken(token, SECRET, { currentDate: at(SESSION_TTL_SECONDS - 1) })).resolves.toEqual({
      userId: USER_ID,
    });
    await expect(verifySessionToken(token, SECRET, { currentDate: at(SESSION_TTL_SECONDS + 1) })).resolves.toBeNull();
  });

  it("rejects a token with a tampered payload", async () => {
    const [header, , signature] = (await signSessionToken(USER_ID, SECRET, NOW)).split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "someone-else", exp: 9_999_999_999 })).toString("base64url");
    await expect(
      verifySessionToken(`${header}.${forged}.${signature}`, SECRET, { currentDate: NOW }),
    ).resolves.toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signSessionToken(USER_ID, `${SECRET}-other`, NOW);
    await expect(verifySessionToken(token, SECRET, { currentDate: NOW })).resolves.toBeNull();
  });

  it("rejects a token signed with another algorithm, even with the right secret", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS512" })
      .setSubject(USER_ID)
      .setExpirationTime(Math.floor(at(60).getTime() / 1000))
      .sign(new TextEncoder().encode(SECRET));
    await expect(verifySessionToken(token, SECRET, { currentDate: NOW })).resolves.toBeNull();
  });

  it("rejects a validly signed token without a subject", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(at(60).getTime() / 1000))
      .sign(new TextEncoder().encode(SECRET));
    await expect(verifySessionToken(token, SECRET, { currentDate: NOW })).resolves.toBeNull();
  });

  it("rejects garbage", async () => {
    await expect(verifySessionToken("not-a-jwt", SECRET, { currentDate: NOW })).resolves.toBeNull();
    await expect(verifySessionToken("", SECRET, { currentDate: NOW })).resolves.toBeNull();
  });
});
