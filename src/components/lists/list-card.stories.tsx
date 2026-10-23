import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import { ListCard, type ListCardProps } from "./list-card";
import { SUMMARIES, taskList } from "./story-fixtures";

const meta = {
  title: "Lists/ListCard",
  component: ListCard,
  args: {
    summary: SUMMARIES.overdue,
    renameList: fn<ListCardProps["renameList"]>(({ id, name }) =>
      Promise.resolve({ ok: true, data: taskList(id, name) }),
    ),
    deleteList: fn<ListCardProps["deleteList"]>(() => Promise.resolve({ ok: true, data: { deletedTasks: 5 } })),
  },
  decorators: [
    (Story, { globals }) => (
      <div className="max-w-sm">
        <Story />
        <Toaster theme={globals.theme === "dark" ? "dark" : "light"} />
      </div>
    ),
  ],
} satisfies Meta<typeof ListCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

async function expectCounters(canvasElement: HTMLElement, expected: Record<string, string>) {
  const canvas = within(canvasElement);
  for (const [label, value] of Object.entries(expected)) {
    const term = canvas.getByText(label, { selector: "dt" });
    await expect(term.nextElementSibling).toHaveTextContent(value);
  }
}

async function expectProgress(canvasElement: HTMLElement, name: string, now: string, text: string) {
  const bar = within(canvasElement).getByRole("progressbar", { name: `Progress of “${name}”` });
  await expect(bar).toHaveAttribute("aria-valuenow", now);
  await expect(bar).toHaveAttribute("aria-valuetext", text);
  await expect(within(canvasElement).getByText(text)).toBeVisible();
}

export const Overdue: Story = {
  name: "R-LIST-1, R-LIST-2, R-LIST-3, R-LIST-4, R-TEST-1: an overdue list shows its name, counters, progress and the red indicator",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "Product launch" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Product launch" })).toHaveAttribute(
      "href",
      `/lists/${SUMMARIES.overdue.list.id}`,
    );
    const indicator = canvas.getByText("1 overdue");
    await expect(indicator).toBeVisible();
    await expect(indicator.querySelector("svg")).not.toBeNull();
    await expectCounters(canvasElement, { New: "2", "In progress": "2", Done: "1", Overdue: "1" });
    await expectProgress(canvasElement, "Product launch", "20", "20% done (1 of 5)");
  },
};

export const DueSoon: Story = {
  name: "R-LIST-4: a deadline within 48 hours shows the yellow indicator, not the red one",
  args: { summary: SUMMARIES.dueSoon },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const indicator = canvas.getByText("Due within 48 hours");
    await expect(indicator).toBeVisible();
    await expect(indicator.querySelector("svg")).not.toBeNull();
    await expect(canvas.queryByText(/^\d+ overdue$/)).toBeNull();
    await expectCounters(canvasElement, { New: "3", "In progress": "1", Done: "1", Overdue: "0" });
    await expectProgress(canvasElement, "Home renovation", "20", "20% done (1 of 5)");
  },
};

export const Neutral: Story = {
  name: "R-LIST-3, R-LIST-4: a finished list has no indicator and shows 100%",
  args: { summary: SUMMARIES.neutral },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/^\d+ overdue$/)).toBeNull();
    await expect(canvas.queryByText("Due within 48 hours")).toBeNull();
    await expectProgress(canvasElement, "Reading list", "100", "100% done (4 of 4)");
  },
};

export const Empty: Story = {
  name: "R-LIST-3: a list without tasks shows 0%, never NaN",
  args: { summary: SUMMARIES.empty },
  play: async ({ canvasElement }) => {
    await expectCounters(canvasElement, { New: "0", "In progress": "0", Done: "0", Overdue: "0" });
    await expectProgress(canvasElement, "Someday", "0", "0% done (0 of 0)");
    await expect(canvasElement.textContent).not.toMatch(/NaN|undefined/);
  },
};

export const KeyboardOrder: Story = {
  name: "The card link and the actions menu are separate tab stops",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Product launch" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Actions for “Product launch”" })).toHaveFocus();
  },
};

export const RenameFromMenu: Story = {
  name: "R-LIST-6: Rename from the menu opens the prefilled dialog and returns focus to the menu",
  play: async ({ args, canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "Actions for “Product launch”" });
    await userEvent.click(trigger);
    await userEvent.click(await page().findByRole("menuitem", { name: "Rename" }));
    const dialog = await page().findByRole("dialog", { name: "Rename “Product launch”" });
    const input = within(dialog).getByRole("textbox", { name: "Name" });
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.keyboard("Launch v2");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save name" }));
    await waitFor(() => expect(page().queryByRole("dialog")).toBeNull());
    await expect(args.renameList).toHaveBeenCalledWith({ id: SUMMARIES.overdue.list.id, name: "Launch v2" });
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const DeleteCancel: Story = {
  name: "R-LIST-7: Delete from the menu names the task count; cancelling deletes nothing and returns focus",
  play: async ({ args, canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "Actions for “Product launch”" });
    await userEvent.click(trigger);
    await userEvent.click(await page().findByRole("menuitem", { name: "Delete" }));
    const dialog = await page().findByRole("alertdialog", { name: "Delete “Product launch” and its 5 tasks?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(page().queryByRole("alertdialog")).toBeNull());
    await expect(args.deleteList).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const Dark: Story = {
  name: "Overdue card in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByText("1 overdue")).toBeVisible();
  },
};

export const DarkDueSoon: Story = {
  name: "Due-soon card in the dark theme",
  args: { summary: SUMMARIES.dueSoon },
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Due within 48 hours")).toBeVisible();
  },
};
