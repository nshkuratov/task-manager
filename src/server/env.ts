import "server-only";
import { z } from "zod";

export type EnvSource = Readonly<Record<string, string | undefined>>;

export interface DatabaseEnv {
  databaseUrl: string;
  databaseAuthToken: string | undefined;
}

export interface Env extends DatabaseEnv {
  sessionSecret: string;
}

export const DEFAULT_DATABASE_URL = "file:./data/app.db";
export const MIN_SESSION_SECRET_LENGTH = 32;
const DEV_SESSION_SECRET = "dev-only-session-secret-never-used-in-production";

export class EnvError extends Error {
  override name = "EnvError";
}

// `cp .env.example .env` leaves `KEY=` lines behind; an empty value must mean "unset", not "invalid".
const optional = z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

const databaseSchema = z
  .object({
    VERCEL: optional,
    DATABASE_URL: optional,
    DATABASE_AUTH_TOKEN: optional,
  })
  .superRefine((raw, ctx) => {
    const url = raw.DATABASE_URL ?? DEFAULT_DATABASE_URL;
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    if (!/^(file:|libsql:\/\/|https?:\/\/)/.test(url)) {
      issue("DATABASE_URL", "must start with file:, libsql://, http:// or https://");
    }
    if (raw.VERCEL === "1" && url.startsWith("file:")) {
      issue(
        "DATABASE_URL",
        "a file: database on Vercel would lose writes (the filesystem is ephemeral); use a libsql:// URL",
      );
    }
    if (url.startsWith("libsql://") && raw.DATABASE_AUTH_TOKEN === undefined) {
      issue("DATABASE_AUTH_TOKEN", "is required when DATABASE_URL is a libsql:// URL");
    }
  });

const sessionSchema = z
  .object({
    NODE_ENV: optional,
    SESSION_SECRET: optional,
  })
  .superRefine((raw, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", path: ["SESSION_SECRET"], message });

    if (raw.SESSION_SECRET === undefined) {
      if (raw.NODE_ENV === "production") issue("is required when NODE_ENV=production");
    } else if (raw.SESSION_SECRET.length < MIN_SESSION_SECRET_LENGTH) {
      issue(`must be at least ${MIN_SESSION_SECRET_LENGTH} characters`);
    }
  });

function fail(issues: readonly z.core.$ZodIssue[]): never {
  const lines = issues.map((issue) => `  ${issue.path.join(".")} ${issue.message}`);
  throw new EnvError(`Invalid environment:\n${lines.join("\n")}`);
}

/** The database subset of {@link parseEnv}; the DB CLIs reuse it so they do not need a session secret. */
export function parseDatabaseEnv(source: EnvSource): DatabaseEnv {
  const result = databaseSchema.safeParse(source);
  if (!result.success) fail(result.error.issues);
  return {
    databaseUrl: result.data.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    databaseAuthToken: result.data.DATABASE_AUTH_TOKEN,
  };
}

/** Validates the whole app environment, reporting every invalid variable at once. Pure: reads only `source`. */
export function parseEnv(source: EnvSource): Env {
  const database = databaseSchema.safeParse(source);
  const session = sessionSchema.safeParse(source);
  if (!database.success || !session.success) {
    fail([...(database.error?.issues ?? []), ...(session.error?.issues ?? [])]);
  }

  return {
    databaseUrl: database.data.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    databaseAuthToken: database.data.DATABASE_AUTH_TOKEN,
    sessionSecret: session.data.SESSION_SECRET ?? DEV_SESSION_SECRET,
  };
}

let cached: Env | undefined;
const load = (): Env => (cached ??= parseEnv(process.env));

/** Parsed on first property access, so importing this module (in tests or during `next build`) never throws. */
export const env: Env = {
  get databaseUrl() {
    return load().databaseUrl;
  },
  get databaseAuthToken() {
    return load().databaseAuthToken;
  },
  get sessionSecret() {
    return load().sessionSecret;
  },
};
