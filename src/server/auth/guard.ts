import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./token";

/**
 * The proxy's optimistic check: a page request without a valid token is sent to `/login?next=<path>`. It
 * never reads the database, so a token for a deleted user passes here and is refused by `requireSession()`,
 * the real gate. Only GET/HEAD are redirected: a Server Action is a POST to the page's route, and its client
 * does not follow an HTTP redirect; `defineAction` answers it with its own redirect instead.
 */
export async function guardRequest(
  request: NextRequest,
  { secret, now }: { secret: string; now: Date },
): Promise<NextResponse> {
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token !== undefined && (await verifySessionToken(token, secret, { currentDate: now })) !== null) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}
