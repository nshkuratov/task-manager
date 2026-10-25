import { test as base, expect, type BrowserContextOptions, type Locator, type Page } from "@playwright/test";
import { ADMIN, CONTEXT_DEFAULTS } from "./env";

type StorageState = Exclude<BrowserContextOptions["storageState"], string | undefined>;

export async function signIn(page: Page, credentials: { email: string; password: string } = ADMIN) {
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/**
 * `test` with the seeded admin already signed in. The sign-in goes through the real form once per worker; its
 * storage state (session cookie and the `tz` cookie) seeds every test's fresh context.
 */
export const test = base.extend<Record<never, never>, { adminState: StorageState }>({
  adminState: [
    async ({ browser }, provide) => {
      const context = await browser.newContext({ ...CONTEXT_DEFAULTS });
      const page = await context.newPage();
      await page.goto("/login");
      await signIn(page);
      await expect(page).toHaveURL(/\/lists$/);
      const state = await context.storageState();
      await context.close();
      await provide(state);
    },
    { scope: "worker" },
  ],
  storageState: async ({ adminState }, provide) => {
    await provide(adminState);
  },
});

export { expect };

/** A name no other test or run shares, so assertions stay relative to this test's own data. */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * `days` calendar days from now as form values (`YYYY-MM-DD`, `HH:MM`) in the browser's pinned zone. One clock
 * read: a date and a time read separately could straddle midnight.
 */
export function localDateTime(page: Page, days: number): Promise<{ date: string; time: string }> {
  return page.evaluate((offset) => {
    const at = new Date();
    at.setDate(at.getDate() + offset);
    return { date: at.toLocaleDateString("en-CA"), time: at.toTimeString().slice(0, 5) };
  }, days);
}

/** The path of the seeded "Product launch" list, read from its card on `/lists`. */
export async function seededListPath(page: Page): Promise<string> {
  await page.goto("/lists");
  const href = await page.getByRole("link", { name: "Product launch", exact: true }).getAttribute("href");
  expect(href).toMatch(/^\/lists\/[0-9a-f-]{36}$/);
  return href ?? "";
}

export function listCard(page: Page, name: string): Locator {
  return page
    .getByRole("list", { name: "Lists" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 2, name, exact: true }) });
}

/** Creates a list on `/lists` and returns its page path. */
export async function createList(page: Page, name: string): Promise<string> {
  await page.goto("/lists");
  await page.getByRole("button", { name: "New list", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New list" });
  await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Create list", exact: true }).click();
  const link = listCard(page, name).getByRole("link", { name, exact: true });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toMatch(/^\/lists\/[0-9a-f-]{36}$/);
  return href ?? "";
}

export async function openListMenu(page: Page, name: string, item: "Rename" | "Delete") {
  await page.getByRole("button", { name: `Actions for “${name}”`, exact: true }).click();
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}

export interface NewTask {
  title: string;
  date?: string;
  time?: string;
  status?: "New" | "In progress" | "Done";
}

export async function addTask(page: Page, task: NewTask) {
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add task" });
  await dialog.getByLabel("Title", { exact: true }).fill(task.title);
  if (task.date !== undefined) await dialog.getByLabel("Date", { exact: true }).fill(task.date);
  if (task.time !== undefined) await dialog.getByLabel("Time (optional)", { exact: true }).fill(task.time);
  if (task.status !== undefined) {
    await dialog.getByRole("combobox", { name: "Status", exact: true }).click();
    await page.getByRole("option", { name: task.status, exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(taskTitles(page).filter({ hasText: task.title })).toBeVisible();
}

/** The title links of the task table's body rows, in rendered order. */
export function taskTitles(page: Page): Locator {
  return page.getByRole("table").getByRole("rowgroup").nth(1).getByRole("link");
}

/** Opens the intercepted edit modal from a task row's actions menu. */
export async function openTaskEdit(page: Page, title: string): Promise<void> {
  await page.getByRole("button", { name: `Actions for ${title}`, exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
}

export async function setStatus(page: Page, title: string, status: "New" | "In progress" | "Done") {
  await page.getByRole("combobox", { name: `Status for ${title}`, exact: true }).click();
  await page.getByRole("option", { name: status, exact: true }).click();
  await expect(page.getByRole("combobox", { name: `Status for ${title}`, exact: true })).toHaveText(status);
}
