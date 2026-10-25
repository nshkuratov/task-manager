import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import type { Task } from "@/contracts";
import {
  TaskCardDialog,
  TaskCardDialogSkeleton,
  TaskNotFoundDialog,
  type TaskCardDialogProps,
} from "./task-card-dialog";

const LIST_ID = "8d1f2a4e-5b6c-4d7e-8f90-a1b2c3d4e5f6";
const TASK: Task = {
  id: "3f6b9c1d-2e4a-4b8c-9d0e-1f2a3b4c5d6e",
  listId: LIST_ID,
  title: "Write report",
  description: "Quarterly numbers for the board",
  status: "new",
  priority: "medium",
  deadline: new Date("2026-10-21T09:00:00Z"),
  createdAt: new Date("2026-10-20T08:30:00Z"),
  updatedAt: new Date("2026-10-22T16:45:00Z"),
};

const meta = {
  title: "TaskCard/TaskCardDialog",
  component: TaskCardDialog,
  parameters: { nextjs: { appDirectory: true } },
  args: {
    task: TASK,
    listName: "Work",
    deadlineInfo: { kind: "overdue", deltaMs: -2 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000 },
    timeZone: "Europe/Amsterdam",
    now: new Date("2026-10-23T10:00:00Z"),
    onSave: fn<TaskCardDialogProps["onSave"]>(() => Promise.resolve({ ok: true, data: undefined })),
    onDelete: fn<TaskCardDialogProps["onDelete"]>(() => Promise.resolve({ ok: true, data: { listId: LIST_ID } })),
  },
  decorators: [
    (Story, { globals }) => (
      <>
        <Story />
        <Toaster theme={globals.theme === "dark" ? "dark" : "light"} />
      </>
    ),
  ],
} satisfies Meta<typeof TaskCardDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

async function openDialog() {
  const dialog = await page().findByRole("dialog", { name: "Edit task" });
  await waitFor(() => expect(dialog).toBeVisible());
  return dialog;
}

export const Opens: Story = {
  name: "R-CARD-1: the card opens in the compact edit dialog",
  play: async () => {
    const dialog = await openDialog();
    await expect(within(dialog).getByRole("textbox", { name: "Title" })).toHaveValue("Write report");
    await expect(within(dialog).getByRole("link", { name: "Work" })).toHaveAttribute(
      "href",
      `/lists/${LIST_ID}`,
    );
    await expect(within(dialog).queryByRole("button", { name: "Delete task" })).toBeNull();
  },
};

export const DirtyClose: Story = {
  name: "R-TEST-1: closing with unsaved edits asks first; Keep editing keeps them, Discard goes back once",
  play: async () => {
    const dialog = await openDialog();
    const description = within(dialog).getByRole("textbox", { name: "Description" });
    await userEvent.type(description, " and the auditors");

    await userEvent.keyboard("{Escape}");
    const confirm = await page().findByRole("alertdialog", { name: "Discard unsaved changes?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(page().queryByRole("alertdialog")).toBeNull());
    await expect(dialog).toBeVisible();
    await expect(description).toHaveValue("Quarterly numbers for the board and the auditors");
    await waitFor(() => expect(description).toHaveFocus());
    await expect(getRouter().back).not.toHaveBeenCalled();

    await userEvent.keyboard("{Escape}");
    const again = await page().findByRole("alertdialog", { name: "Discard unsaved changes?" });
    await userEvent.click(within(again).getByRole("button", { name: "Discard changes" }));
    await waitFor(() => expect(getRouter().back).toHaveBeenCalledOnce());
  },
};

export const CleanClose: Story = {
  name: "Closing an unedited card goes back once, without asking",
  play: async () => {
    await openDialog();
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Escape}");
    await expect(page().queryByRole("alertdialog")).toBeNull();
    await expect(getRouter().back).toHaveBeenCalledOnce();
  },
};

export const SaveCloses: Story = {
  name: "R-CARD-2, R-TASKS-3: saving closes the dialog without the discard prompt",
  play: async ({ args }) => {
    const dialog = await openDialog();
    const title = within(dialog).getByRole("textbox", { name: "Title" });
    await userEvent.clear(title);
    await userEvent.type(title, "Write the annual report");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(getRouter().back).toHaveBeenCalledOnce());
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: TASK.id, title: "Write the annual report" }),
    );
    await expect(page().queryByRole("alertdialog")).toBeNull();
    const notifications = await page().findByRole("region", { name: /Notifications/ });
    const toast = await within(notifications).findByText("Task saved");
    await waitFor(() => expect(toast).toBeVisible());
  },
};

export const NoCloseWhileSaving: Story = {
  name: "R-CARD-2: Escape during a pending save neither asks nor goes back; the landed save closes once",
  play: async ({ args }) => {
    let finish: (result: Awaited<ReturnType<TaskCardDialogProps["onSave"]>>) => void = () => undefined;
    const onSave = args.onSave as ReturnType<typeof fn<TaskCardDialogProps["onSave"]>>;
    onSave.mockImplementation(() => new Promise((resolve) => (finish = resolve)));

    const dialog = await openDialog();
    const title = within(dialog).getByRole("textbox", { name: "Title" });
    await userEvent.clear(title);
    await userEvent.type(title, "Write the annual report");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await within(dialog).findByRole("button", { name: "Saving…" });

    await userEvent.keyboard("{Escape}");
    await expect(page().queryByRole("alertdialog")).toBeNull();
    await expect(getRouter().back).not.toHaveBeenCalled();
    await expect(dialog).toBeVisible();

    finish({ ok: true, data: undefined });
    await waitFor(() => expect(getRouter().back).toHaveBeenCalledOnce());
    await expect(page().queryByRole("alertdialog")).toBeNull();
  },
};

export const ClosableAfterFailedSave: Story = {
  name: "R-CARD-2: after a failed save the dialog can be closed again, and still guards the kept edits",
  args: {
    onSave: fn<TaskCardDialogProps["onSave"]>(() =>
      Promise.resolve({ ok: false, formError: "This task no longer exists." }),
    ),
  },
  play: async () => {
    const dialog = await openDialog();
    const title = within(dialog).getByRole("textbox", { name: "Title" });
    await userEvent.clear(title);
    await userEvent.type(title, "Write the annual report");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await within(dialog).findByText("This task no longer exists.");

    await userEvent.keyboard("{Escape}");
    await page().findByRole("alertdialog", { name: "Discard unsaved changes?" });
    await expect(getRouter().back).not.toHaveBeenCalled();
  },
};

export const NotFound: Story = {
  name: "A missing or foreign task opens a not-found dialog that goes back",
  render: () => <TaskNotFoundDialog />,
  play: async () => {
    const dialog = await page().findByRole("dialog", { name: "Task not found" });
    await expect(dialog).toHaveAccessibleDescription("This task doesn't exist or was deleted.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Back to the list" }));
    await userEvent.keyboard("{Escape}");
    await expect(getRouter().back).toHaveBeenCalledOnce();
  },
};

export const Loading: Story = {
  name: "Loading frame",
  render: () => <TaskCardDialogSkeleton />,
  play: async () => {
    const dialog = await page().findByRole("dialog", { name: "Loading task…" });
    await waitFor(() => expect(dialog).toBeVisible());
  },
};

export const Dark: Story = {
  name: "R-THEME-1, R-EVAL-4: task card dialog in the dark theme",
  globals: { theme: "dark" },
  play: async () => {
    await openDialog();
    await expect(document.documentElement).toHaveClass("dark");
  },
};
