import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { TIMEZONE_COOKIE } from "@/contracts";

export const FALLBACK_TIME_ZONE = "UTC";

export type CookieReader = (name: string) => string | undefined | Promise<string | undefined>;

const readRequestCookie: CookieReader = async (name) => (await cookies()).get(name)?.value;

/** The single sanctioned clock read for pages: one instant per request, however many components ask. */
export const getRequestNow = cache((): Date => new Date());

/**
 * The canonical IANA name for `value`, or `"UTC"` when it is missing or not a zone `Intl` knows.
 * `Intl.supportedValuesOf("timeZone")` is not used: V8 omits `"UTC"` and aliases such as `Asia/Calcutta`.
 */
export function resolveTimeZone(value: string | undefined): string {
  // `timeZone: undefined` does not throw; it silently means the server's own zone.
  if (value === undefined || value === "") return FALLBACK_TIME_ZONE;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
  } catch (error) {
    if (error instanceof RangeError) return FALLBACK_TIME_ZONE;
    throw error;
  }
}

/** The viewer's time zone from the `tz` cookie; a missing or junk value falls back to `"UTC"`. */
export async function getViewerTimeZone(readCookie: CookieReader = readRequestCookie): Promise<string> {
  return resolveTimeZone(await readCookie(TIMEZONE_COOKIE));
}
