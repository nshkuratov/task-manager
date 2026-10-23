import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config } from "./proxy";

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it.each(["/lists", "/lists/3f0c2a1e-1111-4a4a-8b8b-000000000000", "/tasks/abc", "/loginx", "/lists?q=x"])(
    "guards %s",
    (url) => {
      expect(matches(url)).toBe(true);
    },
  );

  it.each(["/", "/login", "/login/", "/login/anything", "/_next/static/chunks/app.js", "/favicon.ico"])(
    "skips %s",
    (url) => {
      expect(matches(url)).toBe(false);
    },
  );
});
