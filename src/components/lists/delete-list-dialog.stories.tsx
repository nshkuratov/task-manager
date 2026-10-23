import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { DeleteListDialog, type DeleteListDialogProps } from "./delete-list-dialog";
import { LIST_GONE } from "./story-fixtures";

const meta = {
  title: "Lists/DeleteListDialog",
  component: DeleteListDialog,
  args: {
    name: "Home renovation",
    taskCount: 5,
    onDelete: fn<DeleteListDialogProps["onDelete"]>(() => Promise.resolve({ ok: true, data: { deletedTasks: 5 } })),
    onDeleted: fn(),
    trigger: <Button variant="outline">Delete list</Button>,
  },
  decorators: [
    (Story, { globals }) => (
      <>
        <Story />
        <Toaster theme={globals.theme === "dark" ? "dark" : "light"} />
      </>
    ),
  ],
} satisfies Meta<typeof DeleteListDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

async function openDialog(canvasElement: HTMLElement, title: string) {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Delete list" }));
  const dialog = await page().findByRole("alertdialog", { name: title });
  await waitFor(() => expect(dialog).toBeVisible());
  return dialog;
}

export const Confirm: Story = {
  name: "R-LIST-7, R-TEST-1: the question names the task count; confirming deletes once and confirms",
  play: async ({ args, canvasElement }) => {
    const dialog = await openDialog(canvasElement, "Delete “Home renovation” and its 5 tasks?");
    await expect(dialog).toHaveAccessibleDescription(
      "The list and every task in it will be removed. This can’t be undone.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete list" }));
    await waitFor(() => expect(page().queryByRole("alertdialog")).toBeNull());
    await expect(args.onDelete).toHaveBeenCalledOnce();
    await expect(args.onDeleted).toHaveBeenCalledOnce();
    const notifications = await page().findByRole("region", { name: /Notifications/ });
    await expect(await within(notifications).findByText("List deleted")).toBeInTheDocument();
  },
};

export const FailureStaysOpen: Story = {
  name: "R-LIST-7: a failed delete keeps the dialog open and announces why",
  args: {
    onDelete: fn<DeleteListDialogProps["onDelete"]>(() => Promise.resolve({ ok: false, formError: LIST_GONE })),
  },
  play: async ({ args, canvasElement }) => {
    const dialog = await openDialog(canvasElement, "Delete “Home renovation” and its 5 tasks?");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete list" }));
    const notifications = await page().findByRole("region", { name: /Notifications/ });
    await expect(await within(notifications).findByText(LIST_GONE)).toBeInTheDocument();
    await expect(dialog).toBeVisible();
    await expect(args.onDeleted).not.toHaveBeenCalled();
  },
};

export const OneTask: Story = {
  name: "A single task is named in the singular",
  args: { name: "Groceries", taskCount: 1 },
  play: async ({ canvasElement }) => {
    await openDialog(canvasElement, "Delete “Groceries” and its 1 task?");
  },
};

export const EmptyList: Story = {
  name: "An empty list is not said to lose tasks",
  args: { name: "Someday", taskCount: 0 },
  play: async ({ canvasElement }) => {
    await openDialog(canvasElement, "Delete “Someday”?");
  },
};

export const Dark: Story = {
  name: "Open in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await openDialog(canvasElement, "Delete “Home renovation” and its 5 tasks?");
  },
};
