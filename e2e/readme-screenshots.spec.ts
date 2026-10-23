import path from "node:path";
import { expect, seededListPath, taskTitles, test } from "./fixtures";

// Regenerate with: README_SCREENSHOTS=1 npx playwright test e2e/readme-screenshots.spec.ts --grep @screenshots
test.skip(!process.env.README_SCREENSHOTS, "README screenshots are generated on demand only");
test.use({ viewport: { width: 1280, height: 800 } });

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test(`@screenshots lists, tasks and card pages (${scheme})`, async ({ page }) => {
      async function capture(view: string) {
        await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${scheme}\\b`));
        await page.waitForFunction(() =>
          document.getAnimations().every((animation) => animation.playState !== "running"),
        );
        const assets = path.join(test.info().project.testDir, "..", "docs", "assets");
        await page.screenshot({ path: path.join(assets, `${view}-${scheme}.png`) });
      }

      const listPath = await seededListPath(page);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await capture("lists");

      await page.goto(listPath);
      await expect(page.getByRole("heading", { level: 1, name: "Product launch" })).toBeVisible();
      await capture("tasks");

      // A click would open the intercepted modal; the hard-loaded page is the standalone card.
      const taskPath = await taskTitles(page).filter({ hasText: "Finalize pricing page copy" }).getAttribute("href");
      expect(taskPath).toMatch(/^\/tasks\/[0-9a-f-]{36}$/);
      await page.goto(taskPath ?? "");
      await expect(page.getByRole("heading", { level: 1, name: "Finalize pricing page copy" })).toBeVisible();
      await capture("card");
    });
  });
}
