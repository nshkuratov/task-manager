import { expect, test } from "@playwright/test";
import { ADMIN } from "./env";
import { signIn } from "./fixtures";

test("R-AUTH-4: a guarded page redirects to /login with next, and signing in returns there", async ({ page }) => {
  await page.goto("/lists?q=launch");

  await expect(page).toHaveURL((url) => url.pathname === "/login");
  expect(new URL(page.url()).searchParams.get("next")).toBe("/lists?q=launch");

  await signIn(page);
  await expect(page).toHaveURL((url) => url.pathname === "/lists" && url.searchParams.get("q") === "launch");
  await expect(page.getByRole("searchbox", { name: "Search lists" })).toHaveValue("launch");
});

test("R-AUTH-1, R-AUTH-2: an empty submit flags both fields and stays on /login", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  const form = page.locator("form");
  const email = page.getByLabel("Email", { exact: true });
  const password = page.getByLabel("Password", { exact: true });
  await expect(form.getByRole("alert").filter({ hasText: "Enter a valid email address" })).toBeVisible();
  await expect(form.getByRole("alert").filter({ hasText: "Enter your password" })).toBeVisible();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(password).toHaveAttribute("aria-invalid", "true");
  await expect(email).toBeFocused();
  await expect(page).toHaveURL((url) => url.pathname === "/login");
});

test("R-AUTH-3: a wrong password shows the form error and does not sign in", async ({ page, context }) => {
  await page.goto("/login");
  await signIn(page, { email: ADMIN.email, password: "not-the-password" });

  await expect(page.locator("form").getByRole("alert")).toHaveText("Email or password is incorrect.");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page).toHaveURL((url) => url.pathname === "/login");
  expect((await context.cookies()).some((cookie) => cookie.name === "tm_session")).toBe(false);
});

test("R-AUTH-4: the admin signs in to /lists and signs out again", async ({ page, context }) => {
  await page.goto("/login");
  await signIn(page);

  await expect(page).toHaveURL((url) => url.pathname === "/lists");
  await expect(page.getByRole("heading", { level: 1, name: "Your lists" })).toBeVisible();
  const session = (await context.cookies()).find((cookie) => cookie.name === "tm_session");
  expect(session).toMatchObject({ httpOnly: true, sameSite: "Lax" });

  await page.getByRole("button", { name: `Account: ${ADMIN.email}` }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/login");

  await page.goto("/lists");
  await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("next") === "/lists");
});
