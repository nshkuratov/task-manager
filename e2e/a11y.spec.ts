import AxeBuilder from "@axe-core/playwright";
import { test as base, type Page } from "@playwright/test";
import { expect, openTaskEdit, seededListPath, test } from "./fixtures";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa"];
const SCHEMES = ["light", "dark"] as const;

async function expectNoViolations(page: Page, scheme: (typeof SCHEMES)[number]) {
  await expect(page.locator("html")).toHaveClass(new RegExp(`(^|\\s)${scheme}(\\s|$)`));
  // A dialog scanned mid-fade reports contrast against its half-transparent self.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" || animation.effect?.getComputedTiming().iterations === Infinity,
      ),
  );
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.map((node) => `${node.target.join(" ")} — ${node.failureSummary ?? ""}`),
  }));
  expect(summary).toEqual([]);
}

for (const colorScheme of SCHEMES) {
  base.describe(`unauthenticated, ${colorScheme}`, () => {
    base.use({ colorScheme });

    base(`R-EVAL-4: /login has no axe violations (${colorScheme})`, async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
      await expectNoViolations(page, colorScheme);
    });
  });

  test.describe(`signed in, ${colorScheme}`, () => {
    test.use({ colorScheme });

    test(`R-EVAL-4: /lists has no axe violations (${colorScheme})`, async ({ page }) => {
      await page.goto("/lists");
      await expect(page.getByRole("heading", { level: 1, name: "Your lists" })).toBeVisible();
      await expectNoViolations(page, colorScheme);
    });

    test(`R-EVAL-4: a list page, its task modal and the standalone card have no axe violations (${colorScheme})`, async ({
      page,
    }) => {
      const listPath = await seededListPath(page);
      await page.goto(listPath);
      await expect(page.getByRole("heading", { level: 1, name: "Product launch" })).toBeVisible();
      await expectNoViolations(page, colorScheme);

      const link = page.getByRole("link", { name: "Finalize pricing page copy", exact: true });
      const taskPath = await link.getAttribute("href");
      expect(taskPath).toMatch(/^\/tasks\/[0-9a-f-]{36}$/);
      await openTaskEdit(page, "Finalize pricing page copy");
      await expect(page.getByRole("dialog", { name: "Edit task" })).toBeVisible();
      await expectNoViolations(page, colorScheme);

      await page.goto(taskPath ?? "");
      await expect(page.getByRole("heading", { level: 1, name: "Finalize pricing page copy" })).toBeVisible();
      await expectNoViolations(page, colorScheme);
    });

    test(`R-EVAL-4: the 404 page has no axe violations (${colorScheme})`, async ({ page }) => {
      await page.goto("/no-such-page");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoViolations(page, colorScheme);
    });
  });
}

test("R-EVAL-4: the list page's loading state renders once and has no axe violations", async ({ page }) => {
  const listPath = await seededListPath(page);
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Holds the soft navigation's RSC fetch (not the prefetch), so the loading boundary stays on screen.
  await page.route(`**${listPath}*`, async (route) => {
    const headers = route.request().headers();
    if (headers["rsc"] !== undefined && headers["next-router-prefetch"] === undefined) await released;
    await route.continue();
  });
  // The loading boundary arrives with the link's prefetch; clicking before it lands shows an empty <main>.
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Product launch", exact: true }).click();
  const loading = page.getByRole("status").filter({ hasText: "Loading tasks…" });
  await expect(loading.first()).toBeAttached();
  await expect(loading).toHaveCount(1);
  await expectNoViolations(page, "light");
  release();
  await expect(page.getByRole("heading", { level: 1, name: "Product launch" })).toBeVisible();
});

const INTERNAL_TERMS = /\bin_progress\b|\bdue-soon\b|\bnull\b|\bundefined\b|\bNaN\b|\[object Object\]/;

test("R-EVAL-4, R-THEME-1: every page uses reader vocabulary and offers the theme toggle", async ({ page }) => {
  const listPath = await seededListPath(page);
  await page.goto(listPath);
  const taskPath = await page
    .getByRole("link", { name: "Finalize pricing page copy", exact: true })
    .getAttribute("href");
  expect(taskPath).toMatch(/^\/tasks\/[0-9a-f-]{36}$/);
  const pages = [
    "/lists",
    "/lists?q=no-such-list-anywhere",
    listPath,
    `${listPath}?status=done`,
    taskPath ?? "",
    "/lists/00000000-0000-4000-8000-000000000000",
    "/x-404",
  ];

  for (const path of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /^Change theme/ })).toBeVisible();
    expect(await page.locator("body").innerText(), path).not.toMatch(INTERNAL_TERMS);
  }

  await page.context().clearCookies();
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^Change theme/ })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toMatch(INTERNAL_TERMS);
});

test("R-EVAL-4: with reduced motion requested, opening a dialog runs no animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lists");
  await page.getByRole("button", { name: "New list", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New list" });
  await expect(dialog).toBeVisible();
  // The computed style, not getAnimations(): an instant animation may already be gone when the page is read.
  const { name, durationMs } = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    const duration = style.animationDuration;
    return {
      name: style.animationName,
      durationMs: parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000),
    };
  });
  expect(name, "the dialog still declares its enter animation").not.toBe("none");
  expect(durationMs).toBeLessThanOrEqual(1);
});

for (const colorScheme of SCHEMES) {
  test(`R-THEME-1: the browser theme colour matches the page background (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/lists");
    await expect(page.locator("html")).toHaveClass(new RegExp(`(^|\\s)${colorScheme}(\\s|$)`));
    const { metaColor, background } = await page.evaluate((scheme) => {
      const meta = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].find(
        (element) => element.media === `(prefers-color-scheme: ${scheme})`,
      );
      // Canvas normalises any CSS colour syntax (oklch, lab, hex) to sRGB bytes.
      const toRgb = (color: string) => {
        const context = document.createElement("canvas").getContext("2d");
        if (context === null) return null;
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      return {
        metaColor: meta === undefined ? null : toRgb(meta.content),
        background: toRgb(getComputedStyle(document.body).backgroundColor),
      };
    }, colorScheme);
    expect(metaColor).not.toBeNull();
    expect(metaColor).toEqual(background);
  });
}
