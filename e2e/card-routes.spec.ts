import { randomUUID } from "node:crypto";
import { addTask, createList, expect, taskTitles, test, uniqueName } from "./fixtures";

test("R-CARD-1: soft navigation opens the card as a modal; hard navigation renders the standalone page", async ({
  page,
}) => {
  const listName = uniqueName("Routes");
  const title = `Card ${listName}`;
  const listPath = await createList(page, listName);
  await page.goto(listPath);
  await addTask(page, { title });

  const link = taskTitles(page).filter({ hasText: title });
  const taskPath = await link.getAttribute("href");
  expect(taskPath).toMatch(/^\/tasks\/[0-9a-f-]{36}$/);
  await link.click();

  await expect(page.getByRole("dialog", { name: title })).toBeVisible();
  await expect(page).toHaveURL((url) => url.pathname === taskPath);
  // By element, not role: the open dialog aria-hides the list behind it.
  await expect(page.locator("h1", { hasText: listName })).toBeAttached();

  await page.goBack();
  await expect(page).toHaveURL((url) => url.pathname === listPath);
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  await page.goto(taskPath ?? "");
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "breadcrumb" }).getByRole("link", { name: listName, exact: true }),
  ).toBeVisible();
});

test("R-CARD-1: an unknown task id renders the not-found page", async ({ page }) => {
  // The page streams, so the status is 200; the content is the contract.
  await page.goto(`/tasks/${randomUUID()}`);
  await expect(page.getByRole("heading", { level: 1, name: "Task not found" })).toBeVisible();
  await expect(page.getByText("This task doesn't exist or was deleted.")).toBeVisible();
});
