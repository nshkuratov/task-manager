import "server-only";
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { users } from "@/server/db/schema";

export interface UserCredentials {
  id: string;
  email: string;
  passwordHash: string;
}

export interface UserIdentity {
  id: string;
  email: string;
}

/** Emails are stored lower-cased, so a lookup lower-cases too: `Admin@Example.com` finds the admin. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export function createUsersRepository(db: Db) {
  return {
    async findByEmail(email: string): Promise<UserCredentials | null> {
      const [row] = await db
        .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.email, normalizeEmail(email)));
      return row ?? null;
    },

    async findById(id: string): Promise<UserIdentity | null> {
      const [row] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, id));
      return row ?? null;
    },
  };
}
