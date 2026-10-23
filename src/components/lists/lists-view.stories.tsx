import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import type { ListSummary } from "@/contracts/task";
import { matchesListQuery } from "@/domain";
import { ListsView } from "./lists-view";
import { ALL_SUMMARIES, LIST_IDS, listSummary, taskList } from "./story-fixtures";

/**
 * `ListsView` over story state standing in for the database: each fake action updates the state before it
 * resolves, as the RSC refresh does, so focus moves run against real Radix dialogs and real re-renders.
 */
function StatefulListsView({ initial, query: initialQuery }: { initial: ListSummary[]; query?: string }) {
  const [summaries, setSummaries] = useState(initial);
  const [query, setQuery] = useState(initialQuery);
  const visible = summaries.filter(({ list }) => matchesListQuery(list.name, query ?? ""));
  const empty = { new: 0, inProgress: 0, done: 0, overdue: 0 };

  return (
    <ListsView
      summaries={visible}
      total={summaries.length}
      query={query}
      onQueryChange={(next) => setQuery(next === "" ? undefined : next)}
      createList={({ name }) => {
        const created = listSummary(LIST_IDS.groceries, name.trim(), empty, "none");
        setSummaries((current) => [created, ...current]);
        return Promise.resolve({ ok: true, data: created.list });
      }}
      renameList={({ id, name }) => {
        setSummaries((current) =>
          current.map((s) => (s.list.id === id ? { ...s, list: { ...s.list, name: name.trim() } } : s)),
        );
        return Promise.resolve({ ok: true, data: taskList(id, name.trim()) });
      }}
      deleteList={({ id }) => {
        const deletedTasks = summaries.find((s) => s.list.id === id)?.counters.total ?? 0;
        setSummaries((current) => current.filter((s) => s.list.id !== id));
        return Promise.resolve({ ok: true, data: { deletedTasks } });
      }}
    />
  );
}

const meta = {
  title: "Lists/ListsView",
  component: StatefulListsView,
  args: { initial: ALL_SUMMARIES },
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/lists" } } },
  decorators: [
    (Story, { globals }) => (
      <>
        <Story />
        <Toaster theme={globals.theme === "dark" ? "dark" : "light"} />
      </>
    ),
  ],
} satisfies Meta<typeof StatefulListsView>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);
const FOCUS = { timeout: 3000 };
// Under the focus helper's 2 s give-up, so reaching the headline by the fallback alone fails.
const BEFORE_FALLBACK = { timeout: 1000 };

async function createGroceries(canvasElement: HTMLElement) {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "New list" }));
  const dialog = await page().findByRole("dialog", { name: "New list" });
  const input = within(dialog).getByRole("textbox", { name: "Name" });
  await waitFor(() => expect(input).toHaveFocus());
  await userEvent.type(input, "Groceries");
  await userEvent.click(within(dialog).getByRole("button", { name: "Create list" }));
}

export const Overview: Story = {
  name: "R-LIST-1, R-EVAL-4: one headline, a count, and a card per list",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("Your lists");
    await expect(canvas.getByText("4 lists")).toBeVisible();
    await expect(within(canvas.getByRole("list", { name: "Lists" })).getAllByRole("listitem")).toHaveLength(4);
    await expect(canvas.getAllByRole("status").every((region) => region.textContent === "")).toBe(true);
  },
};

export const Filtered: Story = {
  name: "R-LIST-8: a search shows how many of the lists match",
  args: { query: "home" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Showing 1 of 4 lists")).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 2, name: "Home renovation" })).toBeVisible();
    const announced = canvas.getAllByRole("status").map((region) => region.textContent);
    await expect(announced).toContain("1 of 4 lists matches “home”");
  },
};

export const SearchAnnouncesOutcome: Story = {
  name: "R-LIST-8, R-EVAL-4: the same live region announces each search's outcome",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [region] = canvas.getAllByRole("status");
    await expect(region).toHaveTextContent(/^$/);
    const input = canvas.getByRole("searchbox", { name: "Search lists" });

    await userEvent.type(input, "re");
    await waitFor(() => expect(region).toHaveTextContent("2 of 4 lists match “re”"));
    await expect(within(canvas.getByRole("list", { name: "Lists" })).getAllByRole("listitem")).toHaveLength(2);

    await userEvent.clear(input);
    await userEvent.type(input, "zzz");
    await waitFor(() => expect(region).toHaveTextContent("No lists match “zzz”"));
    await expect(canvas.getAllByRole("status")[0]).toBe(region);
  },
};

export const NoMatches: Story = {
  name: "R-LIST-8: a search with no results names the query and offers to clear it",
  args: { query: "garden" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "No lists match “garden”" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Clear search" })).toHaveAttribute("href", "/lists");
    await expect(canvas.getByText("Showing 0 of 4 lists")).toBeVisible();
    await expect(canvas.getAllByRole("status").map((region) => region.textContent)).toContain(
      "No lists match “garden”",
    );
  },
};

export const CreateFocusesNewCard: Story = {
  name: "R-LIST-5: after create, focus moves to the new list's card",
  play: async ({ canvasElement }) => {
    await createGroceries(canvasElement);
    const link = await within(canvasElement).findByRole("link", { name: "Groceries" });
    await waitFor(() => expect(link).toHaveFocus(), FOCUS);
    await expect(within(canvasElement).getByText("5 lists")).toBeVisible();
  },
};

export const CreateHiddenBySearch: Story = {
  name: "R-LIST-5: a new list the search hides gets no card, so focus moves to the headline",
  args: { query: "home" },
  play: async ({ canvasElement }) => {
    await createGroceries(canvasElement);
    await waitFor(
      () => expect(within(canvasElement).getByRole("heading", { level: 1, name: "Your lists" })).toHaveFocus(),
      BEFORE_FALLBACK,
    );
    await expect(within(canvasElement).getByText("Showing 1 of 5 lists")).toBeVisible();
  },
};

export const FirstList: Story = {
  name: "R-LIST-5: with no lists the empty state creates the first one",
  args: { initial: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "Create your first list" })).toBeVisible();
    await expect(canvas.getByText("0 lists")).toBeVisible();
    await expect(canvas.queryByRole("searchbox")).toBeNull();
    await createGroceries(canvasElement);
    const link = await canvas.findByRole("link", { name: "Groceries" });
    await waitFor(() => expect(link).toHaveFocus(), FOCUS);
    await expect(canvas.getByText("1 list")).toBeVisible();
  },
};

export const DeleteFocusesHeading: Story = {
  name: "R-LIST-7: after delete the card is gone and focus moves to the headline",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Actions for “Home renovation”" }));
    await userEvent.click(await page().findByRole("menuitem", { name: "Delete" }));
    const dialog = await page().findByRole("alertdialog", { name: "Delete “Home renovation” and its 5 tasks?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete list" }));
    await waitFor(() => expect(canvas.queryByRole("heading", { name: "Home renovation" })).toBeNull());
    await waitFor(() => expect(canvas.getByRole("heading", { level: 1, name: "Your lists" })).toHaveFocus(), FOCUS);
    await expect(canvas.getByText("3 lists")).toBeVisible();
  },
};

export const RenameKeepsFocusOnMenu: Story = {
  name: "R-LIST-6: after rename the card shows the new name and focus is back on its menu",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Actions for “Someday”" }));
    await userEvent.click(await page().findByRole("menuitem", { name: "Rename" }));
    const dialog = await page().findByRole("dialog", { name: "Rename “Someday”" });
    await waitFor(() => expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveFocus());
    await userEvent.keyboard("Maybe later");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save name" }));
    await expect(await canvas.findByRole("heading", { level: 2, name: "Maybe later" })).toBeVisible();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Actions for “Maybe later”" })).toHaveFocus(), FOCUS);
  },
};

export const RenameOutOfSearch: Story = {
  name: "R-LIST-6: a rename the search no longer matches takes the card away and focus goes to the headline",
  args: { query: "launch" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Actions for “Product launch”" }));
    await userEvent.click(await page().findByRole("menuitem", { name: "Rename" }));
    const dialog = await page().findByRole("dialog", { name: "Rename “Product launch”" });
    await waitFor(() => expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveFocus());
    await userEvent.keyboard("Q3 release");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save name" }));
    await waitFor(
      () => expect(within(canvasElement).getByRole("heading", { level: 1, name: "Your lists" })).toHaveFocus(),
      BEFORE_FALLBACK,
    );
    await expect(canvas.getByRole("heading", { level: 2, name: "No lists match “launch”" })).toBeVisible();
  },
};

export const Dark: Story = {
  name: "Every card state in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByText("1 overdue")).toBeVisible();
    await expect(within(canvasElement).getByText("Due within 48 hours")).toBeVisible();
  },
};
