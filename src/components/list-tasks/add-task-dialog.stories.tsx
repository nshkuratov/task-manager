import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import { AddTaskDialog, type AddTaskDialogProps } from "./add-task-dialog";

const LIST_ID = crypto.randomUUID();

const meta = {
  title: "ListTasks/AddTaskDialog",
  component: AddTaskDialog,
  args: {
    listId: LIST_ID,
    timeZone: "Europe/Amsterdam",
    createTask: fn<AddTaskDialogProps["createTask"]>(() => Promise.resolve({ ok: true, data: undefined })),
  },
  decorators: [
    (Story, { globals }) => (
      <>
        <Story />
        <Toaster theme={globals.theme === "dark" ? "dark" : "light"} />
      </>
    ),
  ],
} satisfies Meta<typeof AddTaskDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

async function openDialog(canvasElement: HTMLElement) {
  const trigger = within(canvasElement).getByRole("button", { name: "Add task" });
  await userEvent.click(trigger);
  const dialog = await page().findByRole("dialog", { name: "Add task" });
  await waitFor(() => expect(dialog).toBeVisible());
  return { trigger, dialog };
}

export const Submit: Story = {
  name: "R-TASKS-2, R-TEST-1: fill and submit → createTask gets the list id; the dialog closes and confirms",
  play: async ({ args, canvasElement }) => {
    const { trigger, dialog } = await openDialog(canvasElement);
    const form = within(dialog);
    await userEvent.type(form.getByLabelText("Title"), "Book the launch venue");
    await userEvent.type(form.getByLabelText("Date"), "2026-10-24");
    await userEvent.click(form.getByRole("button", { name: "Add task" }));

    await waitFor(() => expect(page().queryByRole("dialog")).toBeNull());
    await expect(args.createTask).toHaveBeenCalledOnce();
    await expect(args.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        listId: LIST_ID,
        title: "Book the launch venue",
        status: "new",
        priority: "medium",
        deadline: "2026-10-24T23:59:00+02:00",
      }),
    );
    const notifications = await page().findByRole("region", { name: /Notifications/ });
    await expect(await within(notifications).findByText("Task added")).toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const Invalid: Story = {
  name: "R-TASKS-2: an empty title is rejected in the dialog without calling the action",
  play: async ({ args, canvasElement }) => {
    const { dialog } = await openDialog(canvasElement);
    await userEvent.click(within(dialog).getByRole("button", { name: "Add task" }));
    const title = within(dialog).getByLabelText("Title");
    await waitFor(() => expect(title).toHaveAttribute("aria-invalid", "true"));
    await expect(title).toHaveFocus();
    await expect(args.createTask).not.toHaveBeenCalled();
    await expect(dialog).toBeVisible();
  },
};

export const Failure: Story = {
  name: "R-TASKS-2: a server failure keeps the dialog open with the reason",
  args: {
    createTask: fn<AddTaskDialogProps["createTask"]>(() =>
      Promise.resolve({ ok: false, formError: "This list no longer exists." }),
    ),
  },
  play: async ({ canvasElement }) => {
    const { dialog } = await openDialog(canvasElement);
    await userEvent.type(within(dialog).getByLabelText("Title"), "Book the launch venue");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add task" }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent("This list no longer exists.");
    await expect(dialog).toBeVisible();
  },
};

export const Dark: Story = {
  name: "Open in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const { dialog } = await openDialog(canvasElement);
    await expect(document.documentElement).toHaveClass("dark");
    await expect(dialog).toHaveAccessibleDescription("New task in “Product launch”.");
  },
};
