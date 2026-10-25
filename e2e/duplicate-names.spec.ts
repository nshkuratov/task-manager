import { createList, expect, listCard, test, uniqueName } from "./fixtures";

test("R-LIST-5: a list name the user already has is refused on the field, in any case and script", async ({ page }) => {
  // Cyrillic on purpose: SQLite's lower() folds ASCII only, so this is the case a SQL-side comparison would miss.
  const name = `Покупки ${uniqueName("dup")}`;
  await createList(page, name);

  await page.getByRole("button", { name: "New list", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New list" });
  const input = dialog.getByRole("textbox", { name: "Name", exact: true });
  await input.fill(name.toUpperCase());
  await dialog.getByRole("button", { name: "Create list", exact: true }).click();

  await expect(dialog.getByRole("alert")).toHaveText("A list with this name already exists.");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(listCard(page, name)).toHaveCount(1);
  await expect(listCard(page, name.toUpperCase())).toHaveCount(0);
});
