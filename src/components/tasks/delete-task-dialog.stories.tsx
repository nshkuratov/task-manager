import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { DeleteTaskDialog, type DeleteTaskDialogProps } from "./delete-task-dialog";

const LIST_ID = "8d1f2a4e-5b6c-4d7e-8f90-a1b2c3d4e5f6";

const meta = {
  title: "Tasks/DeleteTaskDialog",
  component: DeleteTaskDialog,
  args: {
    title: "Write report",
    onDelete: fn<DeleteTaskDialogProps["onDelete"]>(() => Promise.resolve({ ok: true, data: { listId: LIST_ID } })),
    onDeleted: fn(),
    trigger: <Button variant="outline">Delete task</Button>,
  },
  decorators: [
    (Story, { globals }) => (
      <>
        <Story />
        <Toaster theme={globals.theme === "dark" ? "dark" : "light"} />
      </>
    ),
  ],
} satisfies Meta<typeof DeleteTaskDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

async function openDialog(canvasElement: HTMLElement) {
  const trigger = within(canvasElement).getByRole("button", { name: "Delete task" });
  await userEvent.click(trigger);
  const dialog = await page().findByRole("alertdialog", { name: "Delete “Write report”?" });
  await waitFor(() => expect(dialog).toBeVisible());
  await expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
  return { trigger, dialog };
}

export const Confirm: Story = {
  name: "R-TASKS-4, R-TEST-1: confirming deletes once and hands the list back; Escape cancels",
  play: async ({ args, canvasElement }) => {
    const first = await openDialog(canvasElement);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page().queryByRole("alertdialog")).toBeNull());
    await expect(first.trigger).toHaveFocus();
    await expect(args.onDelete).not.toHaveBeenCalled();

    const { dialog } = await openDialog(canvasElement);
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));
    await waitFor(() => expect(page().queryByRole("alertdialog")).toBeNull());
    await expect(args.onDelete).toHaveBeenCalledOnce();
    await expect(args.onDeleted).toHaveBeenCalledWith(LIST_ID);
  },
};

export const FailureStaysOpen: Story = {
  name: "R-TASKS-4: a failed delete keeps the dialog open and announces why",
  args: {
    onDelete: fn<DeleteTaskDialogProps["onDelete"]>(() =>
      Promise.resolve({ ok: false, formError: "This task no longer exists." }),
    ),
  },
  play: async ({ args, canvasElement }) => {
    const { dialog } = await openDialog(canvasElement);
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));

    const notifications = await page().findByRole("region", { name: /Notifications/ });
    const toast = await within(notifications).findByText("This task no longer exists.");
    await waitFor(() => expect(toast).toBeVisible());
    await expect(dialog).toBeVisible();
    await expect(args.onDeleted).not.toHaveBeenCalled();
  },
};

export const Dark: Story = {
  name: "Open in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await openDialog(canvasElement);
    await expect(document.documentElement).toHaveClass("dark");
  },
};
