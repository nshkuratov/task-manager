import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

type Theme = "light" | "dark" | "";
interface ThemeLog {
  values: Theme[];
  firstFrame: Theme | null;
}

/**
 * Records every `light`/`dark` value `<html>` takes during a page load, and the value at the first animation
 * frame. The server HTML carries no theme class (only font classes) and next-themes' inline script adds one
 * before paint; a flash shows up as a missing class at the first frame or as a second, different value.
 */
function recordThemeClass() {
  const read = (): Theme => {
    const classes = document.documentElement?.classList;
    if (classes?.contains("dark")) return "dark";
    if (classes?.contains("light")) return "light";
    return "";
  };
  const log: ThemeLog = { values: [], firstFrame: null };
  Object.assign(window, { __themeLog: log });
  const record = () => {
    const value = read();
    if (log.values.at(-1) !== value) log.values.push(value);
  };
  new MutationObserver(record).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  requestAnimationFrame(() => {
    record();
    log.firstFrame = read();
  });
}

async function expectNoFlash(page: Page, expected: "light" | "dark") {
  await expect(page.locator("html")).toHaveClass(new RegExp(`(^|\\s)${expected}(\\s|$)`));
  const readLog = () => page.evaluate(() => (window as unknown as { __themeLog: ThemeLog }).__themeLog);
  await expect.poll(async () => (await readLog()).firstFrame).not.toBeNull();
  const log = await readLog();
  expect(log.firstFrame, "theme class at the first frame").toBe(expected);
  expect(
    log.values.filter((value) => value !== ""),
    "every theme class the page took",
  ).toEqual([expected]);
}

async function chooseTheme(page: Page, label: "Light" | "Dark" | "System") {
  await page.getByRole("button", { name: /^Change theme \(current: / }).click();
  await page.getByRole("menuitemradio", { name: label, exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
}

test.use({ colorScheme: "dark" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(recordThemeClass);
});

test("R-THEME-1: with no stored choice the page follows a dark OS scheme without a flash", async ({ page }) => {
  await page.goto("/lists");
  await expectNoFlash(page, "dark");
  await expect(page.getByRole("button", { name: "Change theme (current: System)" })).toBeVisible();
});

test("R-THEME-1: a chosen Light theme persists across a reload without a flash", async ({ page }) => {
  await page.goto("/lists");
  await expectNoFlash(page, "dark");

  await chooseTheme(page, "Light");
  await expect(page.locator("html")).toHaveClass(/(^|\s)light(\s|$)/);

  await page.reload();
  await expectNoFlash(page, "light");
  await expect(page.getByRole("button", { name: "Change theme (current: Light)" })).toBeVisible();
});

test("R-THEME-1: System follows the OS scheme as it changes", async ({ page }) => {
  await page.goto("/lists");
  await chooseTheme(page, "Light");
  await expect(page.locator("html")).toHaveClass(/(^|\s)light(\s|$)/);
  await chooseTheme(page, "System");
  await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);

  await page.reload();
  await expectNoFlash(page, "dark");
  await expect(page.getByRole("button", { name: "Change theme (current: System)" })).toBeVisible();

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass(/(^|\s)light(\s|$)/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
});
