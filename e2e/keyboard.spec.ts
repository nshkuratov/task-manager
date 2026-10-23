import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN } from "./env";
import { seededListPath, test as signedIn, uniqueName } from "./fixtures";

/**
 * Describes the focused element when it is not keyboard-visible, or returns `"visible"`. Visible means
 * `:focus-visible` plus an opaque outline or a box-shadow ring; pseudo-elements count, because the list card's
 * stretched link draws its ring on `::after`, around the whole card.
 */
function focusProblem(): string {
  const element = document.activeElement;
  if (element === null || element === document.body) return "nothing has focus";
  const name = `<${element.tagName.toLowerCase()}${element.id ? ` id="${element.id}"` : ""}> "${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40)}"`;
  // Focus inside a date/time input's closed UA shadow root (its picker button) leaves the host matching only
  // :focus-within, so that is what the app's ring keys off there.
  const inShadow = !element.matches(":focus") && element.matches(":focus-within");
  if (!element.matches(":focus-visible") && !inShadow) return `${name} does not match :focus-visible`;
  // Rings transition in and out; mid-transition a ring that is leaving still reads as drawn.
  if (element.getAnimations().some((animation) => animation.playState === "running")) return `${name} is settling`;
  // A ring, not any shadow: shadcn inputs and outline buttons carry a resting `shadow-xs` (spread 0).
  const isOpaque = (color: string) => {
    if (color === "transparent") return false;
    const alpha = /\/\s*([\d.]+)\)$/.exec(color) ?? /^rgba\((?:[^,]*,){3}\s*([\d.]+)\)$/.exec(color);
    return alpha === null || parseFloat(alpha[1] ?? "1") > 0;
  };
  const draws = [undefined, "::before", "::after"].some((pseudo) => {
    const style = getComputedStyle(element, pseudo);
    if (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0 && isOpaque(style.outlineColor)) {
      return true;
    }
    if (style.boxShadow === "none") return false;
    return style.boxShadow.split(/,(?![^(]*\))/).some((layer) => {
      const color = /^\s*([a-z]+\([^)]*\)|\S+)/.exec(layer)?.[1] ?? "";
      const lengths = [...layer.matchAll(/(-?[\d.]+)px/g)].map((match) => parseFloat(match[1] ?? "0"));
      return (lengths[3] ?? 0) > 0 && isOpaque(color);
    });
  });
  return draws ? "visible" : `${name} draws no outline or ring`;
}

async function expectFocusVisible(page: Page) {
  await expect.poll(() => page.evaluate(focusProblem)).toBe("visible");
}

async function arrowTo(page: Page, item: Locator, maxStops = 10) {
  for (let stop = 0; stop < maxStops; stop++) {
    if (await item.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("ArrowDown");
  }
  await expect(item).toBeFocused();
}

/** Tabs forward until `target` has focus, checking the focus indicator at every stop on the way. */
async function tabTo(page: Page, target: Locator, maxStops = 40) {
  for (let stop = 0; stop < maxStops; stop++) {
    await page.keyboard.press("Tab");
    await expectFocusVisible(page);
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Tab never reached ${target.toString()} in ${maxStops} stops`);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme });

    test(`R-EVAL-4: the golden path works with the keyboard alone and focus stays visible (${colorScheme})`, async ({
      page,
    }) => {
      const listName = uniqueName("Keyboard");
      const title = `Task ${listName}`;
      const description = `Saved from the keyboard ${listName}`;
      const titleLink = page.getByRole("link", { name: title, exact: true });

      await test.step("sign in", async () => {
        await page.goto("/login");
        await expect(page.locator("html")).toHaveClass(new RegExp(`(^|\\s)${colorScheme}(\\s|$)`));
        await tabTo(page, page.getByLabel("Email", { exact: true }));
        await page.keyboard.type(ADMIN.email);
        await tabTo(page, page.getByLabel("Password", { exact: true }));
        await page.keyboard.type(ADMIN.password);
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL((url) => url.pathname === "/lists");
        await expect(page.getByRole("heading", { level: 1, name: "Your lists" })).toBeVisible();
      });

      await test.step("create a list; focus lands on its card", async () => {
        await tabTo(page, page.getByRole("button", { name: "New list", exact: true }));
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", { name: "New list" });
        await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toBeFocused();
        await expectFocusVisible(page);
        await page.keyboard.type(listName);
        await page.keyboard.press("Enter");
        await expect(dialog).toBeHidden();
        await expect(page.getByRole("link", { name: listName, exact: true })).toBeFocused();
        await expectFocusVisible(page);
      });

      await test.step("open it", async () => {
        await page.keyboard.press("Enter");
        await expect(page.getByRole("heading", { level: 1, name: listName })).toBeVisible();
      });

      await test.step("add a task", async () => {
        await tabTo(page, page.getByRole("button", { name: "Add task", exact: true }));
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", { name: "Add task" });
        await expect(dialog.getByLabel("Title", { exact: true })).toBeFocused();
        await expectFocusVisible(page);
        await page.keyboard.type(title);
        await page.keyboard.press("Enter");
        await expect(dialog).toBeHidden();
        await expect(titleLink).toBeVisible();
      });

      await test.step("change its status", async () => {
        const status = page.getByRole("combobox", { name: `Status for ${title}`, exact: true });
        await tabTo(page, status);
        await page.keyboard.press("Enter");
        // Radix focuses the selected option once the listbox has mounted; an earlier arrow key is lost.
        await expect(page.getByRole("option", { name: "New", exact: true })).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await expect(page.getByRole("option", { name: "In progress", exact: true })).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(status).toHaveText("In progress");
        await expect(status).toBeFocused();
        await expectFocusVisible(page);
      });

      await test.step("Escape closes the card and returns focus to its link", async () => {
        await page.keyboard.down("Shift");
        await tabTo(page, titleLink);
        await page.keyboard.up("Shift");
        await page.keyboard.press("Enter");
        await expect(page.getByRole("dialog", { name: title })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.locator('[role="dialog"]')).toHaveCount(0);
        await expect(titleLink).toBeFocused();
        await expectFocusVisible(page);
      });

      await test.step("open the card, edit and save", async () => {
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", { name: title });
        await expect(dialog).toBeVisible();
        await tabTo(page, dialog.getByLabel("Description", { exact: true }));
        await page.keyboard.type(description);
        await tabTo(page, dialog.getByRole("button", { name: "Save changes", exact: true }));
        await page.keyboard.press("Enter");
        await expect(page.locator('[role="dialog"]')).toHaveCount(0);
        await expect(page.getByRole("heading", { level: 1, name: listName })).toBeVisible();
        await expect(titleLink).toBeFocused();
        await expectFocusVisible(page);
      });

      await test.step("the edit persisted", async () => {
        await page.reload();
        const href = await titleLink.getAttribute("href");
        expect(href).toMatch(/^\/tasks\/[0-9a-f-]{36}$/);
        await page.goto(href ?? "");
        await expect(page.getByLabel("Description", { exact: true })).toHaveValue(description);
        await expect(page.getByRole("combobox", { name: "Status", exact: true })).toHaveText("In progress");
        await page.goBack();
        await expect(page.getByRole("heading", { level: 1, name: listName })).toBeVisible();
      });

      await test.step("delete the task; focus lands on the empty state", async () => {
        await tabTo(page, page.getByRole("button", { name: `Actions for ${title}`, exact: true }));
        await page.keyboard.press("Enter");
        await arrowTo(page, page.getByRole("menuitem", { name: "Delete", exact: true }));
        await page.keyboard.press("Enter");
        const confirm = page.getByRole("alertdialog", { name: `Delete “${title}”?` });
        await tabTo(page, confirm.getByRole("button", { name: "Delete task", exact: true }));
        await page.keyboard.press("Enter");
        await expect(confirm).toBeHidden();
        await expect(page.getByText("No tasks yet", { exact: true })).toBeVisible();
        // The element itself, not its text: <body> and <main> contain "No tasks yet" too.
        await expect
          .poll(() =>
            page.evaluate(() => {
              const active = document.activeElement;
              if (active === null || active === document.body || active.tagName === "MAIN") return "page";
              return active.querySelector("h2, h3, p")?.textContent ?? "";
            }),
          )
          .toBe("No tasks yet");
      });

      await test.step("delete the list; focus lands on the headline", async () => {
        await page.goto("/lists");
        await tabTo(page, page.getByRole("button", { name: `Actions for “${listName}”`, exact: true }));
        await page.keyboard.press("Enter");
        await arrowTo(page, page.getByRole("menuitem", { name: "Delete", exact: true }));
        await page.keyboard.press("Enter");
        const confirm = page.getByRole("alertdialog", { name: `Delete “${listName}”?` });
        await tabTo(page, confirm.getByRole("button", { name: "Delete list", exact: true }));
        await page.keyboard.press("Enter");
        await expect(confirm).toBeHidden();
        await expect(page.getByRole("link", { name: listName, exact: true })).toHaveCount(0);
        await expect(page.getByRole("heading", { level: 1, name: "Your lists" })).toBeFocused();
      });
    });
  });
}

signedIn(
  "R-EVAL-4: a task modal opened with nothing focused does not send focus back to an earlier task's link",
  async ({ page }) => {
    await page.goto(await seededListPath(page));
    const first = page.getByRole("link", { name: "Finalize pricing page copy", exact: true });
    const second = page.getByRole("link", { name: "Record the product demo video", exact: true });

    await first.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Finalize pricing page copy" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(first).toBeFocused();

    // Safari does not focus a clicked link: a synthetic click opens the card with <body> focused.
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await second.dispatchEvent("click");
    await expect(page.getByRole("dialog", { name: "Record the product demo video" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(first).not.toBeFocused();
  },
);

signedIn("R-EVAL-4: focus returns to the task link when the card replaced its loading skeleton", async ({ page }) => {
  await page.goto(await seededListPath(page));
  const link = page.getByRole("link", { name: "Finalize pricing page copy", exact: true });
  const taskPath = await link.getAttribute("href");
  expect(taskPath).toMatch(/^\/tasks\/[0-9a-f-]{36}$/);

  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Holds the card's RSC fetch (not the prefetch) so the skeleton dialog is guaranteed to mount first.
  await page.route(`**${taskPath ?? ""}*`, async (route) => {
    const headers = route.request().headers();
    if (headers["rsc"] !== undefined && headers["next-router-prefetch"] === undefined) await released;
    await route.continue();
  });
  await page.waitForLoadState("networkidle");

  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Loading task…" })).toBeVisible();
  // The skeleton's own close runs after the card mounts; it must not pull focus behind the open card.
  // Any element with the link's href (the list may re-render it), via document-level focusin.
  await page.evaluate((href) => {
    const counter = window as unknown as { linkFocusedBehindCard: number };
    counter.linkFocusedBehindCard = 0;
    document.addEventListener(
      "focusin",
      (event) => {
        if (event.target instanceof HTMLAnchorElement && event.target.getAttribute("href") === href) {
          counter.linkFocusedBehindCard += 1;
        }
      },
      true,
    );
  }, taskPath);
  release();
  const card = page.getByRole("dialog", { name: "Finalize pricing page copy" });
  await expect(card).toBeVisible();
  await expect(card.getByLabel("Title", { exact: true })).toBeFocused();
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"));
  expect(
    await page.evaluate(() => (window as unknown as { linkFocusedBehindCard: number }).linkFocusedBehindCard),
    "times the link took focus while the card was open",
  ).toBe(0);
  await page.keyboard.press("Escape");
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await expect(link).toBeFocused();
});
