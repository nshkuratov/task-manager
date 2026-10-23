import {
  addTask,
  createList,
  expect,
  listCard,
  localDateTime,
  openListMenu,
  setStatus,
  taskTitles,
  test,
  uniqueName,
} from "./fixtures";

test("R-LIST-5, R-LIST-6, R-LIST-7, R-TASKS-2, R-TASKS-3, R-TASKS-4, R-TASKS-5, R-CARD-1, R-CARD-2, R-SORT-1, R-SORT-2, R-SORT-4, R-LIST-4, R-EVAL-2: the golden path persists through a full reload", async ({
  page,
}) => {
  const listName = uniqueName("Golden");
  const overdue = `Overdue ${listName}`;
  const dueSoon = `Due soon ${listName}`;
  const undated = `Undated ${listName}`;
  const description = `Edited in the card ${listName}`;

  const listPath = await test.step("create a list", () => createList(page, listName));
  // Tomorrow at the current wall-clock time is ~24 h away on any day, DST changes included; a date-only
  // deadline (23:59) could fall just past 48 h on the night the clocks go back.
  const dueSoonAt = await localDateTime(page, 1);

  await test.step("add three tasks out of order", async () => {
    await page.goto(listPath);
    await expect(page.getByRole("heading", { level: 1, name: listName })).toBeVisible();
    await addTask(page, { title: undated });
    await addTask(page, { title: dueSoon, ...dueSoonAt });
    await addTask(page, { title: overdue, date: (await localDateTime(page, -1)).date });
  });

  await test.step("R-SORT: overdue first, then nearer deadline, undated last", async () => {
    await expect(taskTitles(page)).toHaveText([overdue, dueSoon, undated]);
    await expect(
      page.getByRole("row").filter({ hasText: overdue }).getByRole("img", { name: "Overdue" }),
    ).toBeVisible();
  });

  await test.step("the list card shows the overdue indicator", async () => {
    await page.goto("/lists");
    const card = listCard(page, listName);
    await expect(card.getByText("1 overdue", { exact: true })).toBeVisible();
    await expect(card.getByRole("progressbar")).toHaveAttribute("aria-valuetext", /\(0 of 3\)$/);
  });

  await test.step("marking the overdue task Done moves it last and clears the red indicator", async () => {
    await page.goto(listPath);
    await setStatus(page, overdue, "Done");
    await expect(taskTitles(page)).toHaveText([dueSoon, undated, overdue]);

    await page.goto("/lists");
    const card = listCard(page, listName);
    await expect(card.getByRole("definition")).toHaveText(["2", "0", "1", "0"]);
    await expect(card.getByRole("term")).toHaveText(["New", "In progress", "Done", "Overdue"]);
    await expect(card.getByText("Due within 48 hours", { exact: true })).toBeVisible();
    await expect(card.getByText(/^\d+ overdue$/)).toHaveCount(0);
    await expect(card.getByRole("progressbar")).toHaveAttribute("aria-valuetext", /\(1 of 3\)$/);
  });

  const taskPath = await test.step("open the card as a modal from the table, edit and save", async () => {
    await page.goto(listPath);
    const link = taskTitles(page).filter({ hasText: dueSoon });
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/tasks\/[0-9a-f-]{36}$/);
    await link.click();

    const dialog = page.getByRole("dialog", { name: dueSoon });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === href);
    // By element, not role: the open dialog aria-hides the list behind it, which a role query reads as gone.
    await expect(page.locator("h1", { hasText: listName })).toBeAttached();
    await expect(dialog.getByLabel("Title", { exact: true })).toHaveValue(dueSoon);
    await expect(dialog.getByRole("combobox", { name: "Status", exact: true })).toHaveText("New");
    await expect(dialog.getByLabel("Date", { exact: true })).toHaveValue(dueSoonAt.date);

    await dialog.getByLabel("Description", { exact: true }).fill(description);
    await dialog.getByRole("combobox", { name: "Priority", exact: true }).click();
    await page.getByRole("option", { name: "High", exact: true }).click();
    await dialog.getByRole("button", { name: "Save changes", exact: true }).click();

    await expect(page).toHaveURL((url) => url.pathname === listPath);
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    return href ?? "";
  });

  await test.step("a full reload shows everything persisted", async () => {
    await page.reload();
    await expect(taskTitles(page)).toHaveText([dueSoon, undated, overdue]);
    await expect(page.getByRole("combobox", { name: `Status for ${overdue}` })).toHaveText("Done");
    await expect(page.getByRole("row").filter({ hasText: dueSoon })).toContainText("High");

    await page.goto(taskPath);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: dueSoon })).toBeVisible();
    await expect(page.getByLabel("Description", { exact: true })).toHaveValue(description);
    await expect(page.getByRole("combobox", { name: "Priority", exact: true })).toHaveText("High");
  });

  const renamed = `${listName} renamed`;
  await test.step("rename the list", async () => {
    await page.goto("/lists");
    await openListMenu(page, listName, "Rename");
    const dialog = page.getByRole("dialog", { name: `Rename “${listName}”` });
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(renamed);
    await dialog.getByRole("button", { name: "Save name", exact: true }).click();
    await expect(listCard(page, renamed)).toBeVisible();
    await expect(listCard(page, listName)).toHaveCount(0);
  });

  await test.step("delete a task", async () => {
    await page.goto(listPath);
    await expect(page.getByRole("heading", { level: 1, name: renamed })).toBeVisible();
    await page.getByRole("button", { name: `Actions for ${undated}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await page
      .getByRole("alertdialog", { name: `Delete “${undated}”?` })
      .getByRole("button", { name: "Delete task", exact: true })
      .click();
    await expect(taskTitles(page)).toHaveText([dueSoon, overdue]);
    await page.reload();
    await expect(taskTitles(page)).toHaveText([dueSoon, overdue]);
  });

  await test.step("delete the list", async () => {
    await page.goto("/lists");
    await openListMenu(page, renamed, "Delete");
    await page
      .getByRole("alertdialog", { name: `Delete “${renamed}” and its 2 tasks?` })
      .getByRole("button", { name: "Delete list", exact: true })
      .click();
    await expect(listCard(page, renamed)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Your lists" })).toBeVisible();
    await expect(listCard(page, renamed)).toHaveCount(0);
    await page.goto(listPath);
    await expect(page.getByRole("heading", { level: 1, name: "This list doesn’t exist or was deleted" })).toBeVisible();
  });
});
