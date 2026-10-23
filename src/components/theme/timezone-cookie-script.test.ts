import { describe, expect, it } from "vitest";
import { TIMEZONE_COOKIE } from "@/contracts/cookies";
import { TIMEZONE_COOKIE_SCRIPT } from "./timezone-cookie-script";

function run({
  cookie = "",
  timeZone,
  protocol = "http:",
}: {
  cookie?: string;
  timeZone: string | undefined;
  protocol?: string;
}) {
  const writes: string[] = [];
  const document = {
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      writes.push(value);
    },
  };
  const intl = { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone }) }) };
  new Function("document", "location", "Intl", TIMEZONE_COOKIE_SCRIPT)(document, { protocol }, intl);
  return writes;
}

describe("timezone cookie script", () => {
  it("uses the shared cookie name", () => {
    expect(TIMEZONE_COOKIE_SCRIPT).toContain(JSON.stringify(TIMEZONE_COOKIE));
  });

  it("writes the encoded zone when the cookie is missing", () => {
    expect(run({ cookie: "other=1", timeZone: "America/Argentina/Buenos_Aires" })).toEqual([
      "tz=America%2FArgentina%2FBuenos_Aires; path=/; SameSite=Lax; max-age=31536000",
    ]);
  });

  it("does nothing when the stored zone already matches", () => {
    expect(run({ cookie: "a=1; tz=Europe%2FAmsterdam; b=2", timeZone: "Europe/Amsterdam" })).toEqual([]);
  });

  it("rewrites a stale zone", () => {
    expect(run({ cookie: "tz=Europe%2FAmsterdam", timeZone: "Asia/Tokyo" })).toEqual([
      "tz=Asia%2FTokyo; path=/; SameSite=Lax; max-age=31536000",
    ]);
  });

  it("rewrites a malformed stored value instead of throwing", () => {
    expect(run({ cookie: "tz=%E0%A4%A", timeZone: "UTC" })).toEqual(["tz=UTC; path=/; SameSite=Lax; max-age=31536000"]);
  });

  it("does not mistake a cookie whose name ends in the same letters", () => {
    expect(run({ cookie: "xtz=UTC", timeZone: "UTC" })).toHaveLength(1);
  });

  it("adds Secure only on https", () => {
    expect(run({ timeZone: "UTC", protocol: "https:" })).toEqual([
      "tz=UTC; path=/; SameSite=Lax; max-age=31536000; Secure",
    ]);
  });

  it("writes nothing when the runtime reports no zone", () => {
    expect(run({ timeZone: undefined })).toEqual([]);
    expect(run({ timeZone: "" })).toEqual([]);
  });
});
