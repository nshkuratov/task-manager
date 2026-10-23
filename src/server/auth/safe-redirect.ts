import "server-only";

const SENTINEL_ORIGIN = "http://sentinel.invalid";
// The URL parser silently turns `\` into `/` and strips tab/newline, so such input is refused, not normalised.
const UNSAFE_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

function isLoginPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return lower === "/login" || lower.startsWith("/login/");
}

/**
 * The same-origin path (`pathname + search + hash`) to send the user to after sign-in, or `null` when `next`
 * is not a plain local path. The result itself is re-checked: dot segments such as `/.//evil.com` resolve on
 * the sentinel origin yet collapse to the protocol-relative `//evil.com`.
 */
export function safeRedirect(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || UNSAFE_CHARACTERS.test(next)) return null;

  const url = new URL(next, SENTINEL_ORIGIN);
  if (url.origin !== SENTINEL_ORIGIN || isLoginPath(url.pathname)) return null;

  const target = url.pathname + url.search + url.hash;
  return target.startsWith("//") ? null : target;
}
