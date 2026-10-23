import "server-only";
import { errors, jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "tm_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const ALGORITHM = "HS256";
const encoder = new TextEncoder();

export interface SessionClaims {
  userId: string;
}

/** Signs a session token for `userId`, issued at `now` and expiring {@link SESSION_TTL_SECONDS} later. */
export async function signSessionToken(userId: string, secret: string, now: Date): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .sign(encoder.encode(secret));
}

/**
 * Returns the claims of a valid token, or `null` for any token that fails verification (bad signature,
 * expired, another algorithm, no subject). Errors that are not verification failures propagate.
 */
export async function verifySessionToken(
  token: string,
  secret: string,
  { currentDate }: { currentDate: Date },
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), { algorithms: [ALGORITHM], currentDate });
    return typeof payload.sub === "string" && payload.sub !== "" ? { userId: payload.sub } : null;
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }
}
