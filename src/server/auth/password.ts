import "server-only";
import bcrypt from "bcryptjs";

/**
 * A cost-12 bcrypt hash of random bytes nobody kept, so no password matches it. An unknown email is compared
 * against it so the miss costs the same time as a wrong password for a real user; a test pins its cost to the
 * seeded hash's.
 */
export const DUMMY_PASSWORD_HASH = "$2b$12$50JdCPbbaN6vYPkgGuefpenEltUvPcRlWg/7vQxss5kZWay/DLWzu";

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
