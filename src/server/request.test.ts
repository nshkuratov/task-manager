import { describe, expect, it } from "vitest";
import { TIMEZONE_COOKIE } from "@/contracts";
import { getRequestNow, getViewerTimeZone, resolveTimeZone, type CookieReader } from "./request";

const cookieJar =
  (jar: Record<string, string>): CookieReader =>
  (name) =>
    jar[name];

describe("getViewerTimeZone", () => {
  it("returns a valid zone from the tz cookie", async () => {
    await expect(getViewerTimeZone(cookieJar({ [TIMEZONE_COOKIE]: "America/New_York" }))).resolves.toBe(
      "America/New_York",
    );
  });

  it("canonicalises a zone written in the wrong case", async () => {
    await expect(getViewerTimeZone(cookieJar({ [TIMEZONE_COOKIE]: "asia/tokyo" }))).resolves.toBe("Asia/Tokyo");
  });

  it("falls back to UTC for a zone Intl does not know", async () => {
    await expect(getViewerTimeZone(cookieJar({ [TIMEZONE_COOKIE]: "Mars/Olympus" }))).resolves.toBe("UTC");
  });

  // The test runner pins TZ=Europe/Amsterdam, so a fallback to the host zone would fail here.
  it("falls back to UTC, not the server's zone, when there is no cookie", async () => {
    await expect(getViewerTimeZone(cookieJar({}))).resolves.toBe("UTC");
  });

  it("falls back to UTC for an empty cookie", async () => {
    await expect(getViewerTimeZone(cookieJar({ [TIMEZONE_COOKIE]: "" }))).resolves.toBe("UTC");
  });

  it("reads the tz cookie by its contract name, through an async reader", async () => {
    const asked: string[] = [];
    const reader: CookieReader = async (name) => {
      asked.push(name);
      return "Europe/Lisbon";
    };
    await expect(getViewerTimeZone(reader)).resolves.toBe("Europe/Lisbon");
    expect(asked).toEqual(["tz"]);
  });

  it("propagates a failing cookie reader instead of guessing a zone", async () => {
    const failure = new TypeError("cookie store unavailable");
    await expect(
      getViewerTimeZone(() => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
});

describe("resolveTimeZone", () => {
  it("accepts UTC itself, which Intl.supportedValuesOf omits", () => {
    expect(resolveTimeZone("UTC")).toBe("UTC");
    expect(Intl.supportedValuesOf("timeZone")).not.toContain("UTC");
  });

  it("accepts a legacy alias", () => {
    expect(resolveTimeZone("Asia/Calcutta")).toBe("Asia/Calcutta");
  });

  it("accepts a fixed UTC offset, which Intl formats correctly", () => {
    expect(resolveTimeZone("+05:30")).toBe("+05:30");
  });
});

describe("getRequestNow", () => {
  it("returns the current instant as a Date", () => {
    const before = Date.now();
    const now = getRequestNow();
    expect(now).toBeInstanceOf(Date);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
