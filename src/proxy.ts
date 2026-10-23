import type { NextRequest } from "next/server";
import { guardRequest } from "@/server/auth/guard";
import { env } from "@/server/env";

export function proxy(request: NextRequest) {
  return guardRequest(request, { secret: env.sessionSecret, now: new Date() });
}

export const config = {
  // Everything except `/`, `/login` (and below), Next's own `/_next/*`, and paths whose last segment has an
  // extension (static files).
  matcher: ["/((?!_next/|login(?:/|$)|.*\\.[^/]+$).+)"],
};
