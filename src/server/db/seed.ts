import "server-only";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import type { Db } from "./client";
import { lists, tasks, users } from "./schema";
import { buildDemoData } from "./seed-data";

export const ADMIN_EMAIL = "admin@example.com";
/** The documented demo credential. It lives only here and in the docs; the database stores its bcrypt hash. */
export const ADMIN_PASSWORD = "Admin123!";
export const BCRYPT_COST = 12;

export interface SeedResult {
  userCreated: boolean;
  listsInserted: number;
}

export function formatSeedResult({ userCreated, listsInserted }: SeedResult): string {
  const user = userCreated ? "user created" : "user exists";
  const suffix = listsInserted === 0 ? " (already seeded)" : "";
  return `seeded: ${user}, ${listsInserted} lists inserted${suffix}`;
}

async function findAdminId(db: Db): Promise<string | undefined> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, ADMIN_EMAIL));
  return row?.id;
}

/**
 * Idempotent: the admin row is inserted only if missing (hashing only then), and the demo lists only if the
 * admin has no lists at all. The lists and their tasks go in as one batch, so a failure leaves none behind.
 */
export async function seed(db: Db, { now = new Date() }: { now?: Date } = {}): Promise<SeedResult> {
  let userCreated = false;
  let userId = await findAdminId(db);
  if (userId === undefined) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_COST);
    const inserted = await db
      .insert(users)
      .values({ id: crypto.randomUUID(), email: ADMIN_EMAIL, passwordHash, createdAt: now.getTime() })
      .onConflictDoNothing()
      .returning({ id: users.id });
    userCreated = inserted.length === 1;
    userId = await findAdminId(db);
  }
  if (userId === undefined) throw new Error(`seed: ${ADMIN_EMAIL} is missing after insert`);

  const [existing] = await db
    .select({ n: sql<number>`count(*)` })
    .from(lists)
    .where(eq(lists.userId, userId));
  if ((existing?.n ?? 0) > 0) return { userCreated, listsInserted: 0 };

  const demo = buildDemoData(now);
  const [first, ...rest] = demo.flatMap((list) => {
    const listId = crypto.randomUUID();
    const createdAt = list.createdAt.getTime();
    return [
      db.insert(lists).values({ id: listId, userId, name: list.name, createdAt, updatedAt: createdAt }),
      ...list.tasks.map((task) =>
        db.insert(tasks).values({
          id: crypto.randomUUID(),
          listId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline === null ? null : task.deadline.getTime(),
          createdAt,
          updatedAt: createdAt,
        }),
      ),
    ];
  });
  if (first !== undefined) await db.batch([first, ...rest]);
  return { userCreated, listsInserted: demo.length };
}
