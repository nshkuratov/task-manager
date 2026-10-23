export const PORT = 3210;
export const BASE_URL = `http://localhost:${PORT}`;

/**
 * Pinned per context so dates and rendering do not depend on the host. Shared by the config and the worker
 * sign-in fixture, which opens its own context and does not inherit the config's `use`.
 */
export const CONTEXT_DEFAULTS = {
  baseURL: BASE_URL,
  timezoneId: "Europe/Amsterdam",
  locale: "en-GB",
  colorScheme: "light",
} as const;

export const ADMIN = { email: "admin@example.com", password: "Admin123!" } as const;
