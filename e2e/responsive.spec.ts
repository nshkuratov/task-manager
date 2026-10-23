import { test as base, type Locator, type Page } from "@playwright/test";
import { expect, seededListPath, test } from "./fixtures";

/** Tailwind's `sm`: below it the task table is wider than its container. */
const SM_BREAKPOINT = 640;

const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
] as const;

async function expectNoPageScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "page width").toBeLessThanOrEqual(clientWidth);
}

/** Fixed-position dialogs never widen the page, so they are measured against the viewport directly. */
async function expectDialogFits(page: Page, dialog: Locator) {
  await expect(dialog).toBeVisible();
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"));
  const box = await dialog.boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(box, "dialog box").not.toBeNull();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? Infinity)).toBeLessThanOrEqual(width);
}

for (const viewport of VIEWPORTS) {
  const size = `${viewport.width}×${viewport.height}`;

  base.describe(`unauthenticated at ${size}`, () => {
    base.use({ viewport });

    base(`R-EVAL-4: /login does not scroll sideways at ${size}`, async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
      await expectNoPageScroll(page);
    });
  });

  test.describe(`signed in at ${size}`, () => {
    test.use({ viewport });

    test(`R-EVAL-4: no page scrolls sideways at ${size}; the task table scrolls inside its region`, async ({
      page,
    }) => {
      await page.goto("/lists");
      await expect(page.getByRole("heading", { level: 1, name: "Your lists" })).toBeVisible();
      await expectNoPageScroll(page);

      await page.goto(await seededListPath(page));
      await expect(page.getByRole("heading", { level: 1, name: "Product launch" })).toBeVisible();
      await expectNoPageScroll(page);

      const table = page.getByRole("table");
      const region = page.getByRole("region").filter({ has: table });
      await expect(region).toHaveCount(1);
      const fits = await region.evaluate((element) => ({
        regionScrolls: element.scrollWidth > element.clientWidth,
        overflowX: getComputedStyle(element).overflowX,
      }));
      expect(["auto", "scroll"]).toContain(fits.overflowX);
      if (viewport.width < SM_BREAKPOINT)
        expect(fits.regionScrolls, "the table overflows into its own scroller").toBe(true);

      await page.getByRole("button", { name: "Add task", exact: true }).click();
      const addTask = page.getByRole("dialog", { name: "Add task" });
      await expectDialogFits(page, addTask);
      await page.keyboard.press("Escape");
      await expect(addTask).toBeHidden();

      const taskLink = page.getByRole("link", { name: "Finalize pricing page copy", exact: true });
      const taskPath = await taskLink.getAttribute("href");
      expect(taskPath).toMatch(/^\/tasks\/[0-9a-f-]{36}$/);
      await taskLink.click();
      await expectDialogFits(page, page.getByRole("dialog", { name: "Finalize pricing page copy" }));

      await page.goto(taskPath ?? "");
      await expect(page.getByRole("heading", { level: 1, name: "Finalize pricing page copy" })).toBeVisible();
      await expectNoPageScroll(page);

      await page.goto("/no-such-page");
      await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
      await expectNoPageScroll(page);
    });
  });
}
