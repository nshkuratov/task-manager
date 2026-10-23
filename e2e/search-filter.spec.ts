import { addTask, createList, expect, taskTitles, test, uniqueName } from "./fixtures";

test("R-LIST-8: search narrows the cards and the URL round-trips on reload", async ({ page }) => {
  const stamp = uniqueName("Search");
  const alpha = `Alpha ${stamp}`;
  const beta = `Beta ${stamp}`;
  await createList(page, alpha);
  await createList(page, beta);

  const names = page.getByRole("list", { name: "Lists" }).getByRole("heading", { level: 2 });
  const search = page.getByRole("searchbox", { name: "Search lists", exact: true });

  await search.fill(stamp);
  await expect(page).toHaveURL((url) => url.searchParams.get("q") === stamp);
  await expect(names).toHaveCount(2);
  await expect(names.filter({ hasText: alpha })).toHaveCount(1);
  await expect(names.filter({ hasText: beta })).toHaveCount(1);

  await search.fill(alpha.toLowerCase());
  await expect(page).toHaveURL((url) => url.searchParams.get("q") === alpha.toLowerCase());
  await expect(names).toHaveText([alpha]);

  await page.reload();
  await expect(search).toHaveValue(alpha.toLowerCase());
  await expect(names).toHaveText([alpha]);
});

test("R-TASKS-6: the status filter narrows the rows and the URL round-trips on reload", async ({ page }) => {
  const stamp = uniqueName("Filter");
  const open = `Open ${stamp}`;
  const finished = `Finished ${stamp}`;
  const listPath = await createList(page, stamp);
  await page.goto(listPath);
  await addTask(page, { title: open });
  await addTask(page, { title: finished, status: "Done" });
  await expect(taskTitles(page)).toHaveText([open, finished]);

  const done = page.getByRole("button", { name: "Done 1", exact: true });
  await done.click();
  await expect(page).toHaveURL((url) => url.pathname === listPath && url.searchParams.get("status") === "done");
  await expect(taskTitles(page)).toHaveText([finished]);

  await page.reload();
  await expect(done).toHaveAttribute("aria-pressed", "true");
  await expect(taskTitles(page)).toHaveText([finished]);

  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === listPath && !url.searchParams.has("status"));
  await expect(taskTitles(page)).toHaveText([open, finished]);
});
