import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import type { ActionResult, Task } from "@/contracts";
import { TaskCard, type TaskCardProps } from "./task-card";

const TIME_ZONE = "Europe/Amsterdam";
const NOW = new Date("2026-10-23T10:00:00Z");
const LIST_ID = "8d1f2a4e-5b6c-4d7e-8f90-a1b2c3d4e5f6";

const TASK: Task = {
  id: "3f6b9c1d-2e4a-4b8c-9d0e-1f2a3b4c5d6e",
  listId: LIST_ID,
  title: "Write report",
  description: "Quarterly numbers for the board",
  status: "in_progress",
  priority: "medium",
  deadline: new Date("2026-10-24T15:00:00Z"),
  createdAt: new Date("2026-10-20T08:30:00Z"),
  updatedAt: new Date("2026-10-22T16:45:00Z"),
};

const saved = (): Promise<ActionResult<unknown>> => Promise.resolve({ ok: true, data: undefined });

const meta = {
  title: "TaskCard/TaskCard",
  component: TaskCard,
  parameters: { nextjs: { appDirectory: true } },
  args: {
    task: TASK,
    listName: "Work",
    deadlineInfo: { kind: "due-soon", deltaMs: 29 * 60 * 60 * 1000 },
    timeZone: TIME_ZONE,
    now: NOW,
    onSave: fn<TaskCardProps["onSave"]>(saved),
    onDelete: fn<TaskCardProps["onDelete"]>(() => Promise.resolve({ ok: true, data: { listId: LIST_ID } })),
  },
  decorators: [
    (Story, { globals }) => (
      <div className="max-w-2xl">
        <Story />
        <Toaster theme={globals.theme === "dark" ? "dark" : "light"} />
      </div>
    ),
  ],
} satisfies Meta<typeof TaskCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

function fields(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  return {
    canvas,
    title: canvas.getByRole("textbox", { name: "Title" }),
    description: canvas.getByRole("textbox", { name: "Description" }),
    status: canvas.getByRole("combobox", { name: "Status" }),
    priority: canvas.getByRole("combobox", { name: "Priority" }),
    date: canvas.getByLabelText("Date"),
    time: canvas.getByLabelText("Time (optional)"),
    save: canvas.getByRole("button", { name: "Save changes" }),
  };
}

async function choose(trigger: HTMLElement, option: string) {
  await userEvent.click(trigger);
  await userEvent.click(await page().findByRole("option", { name: option }));
  // Radix keeps the page inert until the listbox's exit animation ends.
  await waitFor(() => expect(page().queryByRole("listbox")).toBeNull());
}

export const ShowsAllFields: Story = {
  name: "R-CARD-1, R-TEST-1: the card shows title, description, status, priority and deadline",
  play: async ({ canvasElement }) => {
    const { canvas, title, description, status, priority, date, time, save } = fields(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Write report" })).toBeVisible();
    await expect(canvas.getByText("in 1 day")).toBeVisible();
    await expect(canvas.getByRole("img", { name: "Due within 48 hours" })).toBeVisible();

    await expect(title).toHaveValue("Write report");
    await expect(description).toHaveValue("Quarterly numbers for the board");
    await expect(status).toHaveTextContent("In progress");
    await expect(priority).toHaveTextContent("Medium");
    await expect(date).toHaveValue("2026-10-24");
    await expect(time).toHaveValue("17:00");

    await expect(canvas.getByRole("link", { name: "Work" })).toHaveAttribute("href", `/lists/${LIST_ID}`);
    await expect(canvas.getByText("Tue 20 Oct, 10:30")).toBeVisible();
    await expect(canvas.getByText("Thu 22 Oct, 18:45")).toBeVisible();
    await expect(save).toHaveAttribute("aria-disabled", "true");
  },
};

export const EditAndSave: Story = {
  name: "R-CARD-2, R-TASKS-3, R-TEST-1: edits are saved with the task id, pending while the save runs",
  play: async ({ args, canvasElement }) => {
    let finish: (result: ActionResult<unknown>) => void = () => undefined;
    const onSave = args.onSave as ReturnType<typeof fn<TaskCardProps["onSave"]>>;
    onSave.mockImplementation(() => new Promise((resolve) => (finish = resolve)));

    const { canvas, title, priority, save } = fields(canvasElement);
    await userEvent.clear(title);
    await userEvent.type(title, "Write the annual report");
    await choose(priority, "High");
    await expect(save).not.toHaveAttribute("aria-disabled");

    await userEvent.click(save);
    const pending = await canvas.findByRole("button", { name: "Saving…" });
    await expect(pending).toHaveAttribute("aria-busy", "true");
    await expect(onSave).toHaveBeenCalledOnce();
    await expect(onSave).toHaveBeenCalledWith({
      id: TASK.id,
      title: "Write the annual report",
      description: "Quarterly numbers for the board",
      status: "in_progress",
      priority: "high",
      deadline: "2026-10-24T17:00:00+02:00",
    });

    finish({ ok: true, data: undefined });
    const notifications = await page().findByRole("region", { name: /Notifications/ });
    const toast = await within(notifications).findByText("Task saved");
    await waitFor(() => expect(toast).toBeVisible());
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Save changes" })).toHaveAttribute("aria-disabled", "true"),
    );
    await expect(title).toHaveValue("Write the annual report");
  },
};

export const SaveError: Story = {
  name: "R-CARD-2: a failed save shows why and keeps the edits",
  args: {
    onSave: fn<TaskCardProps["onSave"]>(() => Promise.resolve({ ok: false, formError: "This task no longer exists." })),
    onSaved: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const { canvas, description, save } = fields(canvasElement);
    await userEvent.clear(description);
    await userEvent.type(description, "Numbers for Q4");
    await userEvent.click(save);

    const alert = await canvas.findByText("This task no longer exists.");
    await expect(alert).toHaveAttribute("role", "alert");
    await expect(description).toHaveValue("Numbers for Q4");
    await expect(args.onSave).toHaveBeenCalledOnce();
    await expect(args.onSaved).not.toHaveBeenCalled();
    await expect(await canvas.findByRole("button", { name: "Save changes" })).not.toHaveAttribute("aria-disabled");
  },
};

export const Delete: Story = {
  name: "R-TASKS-4, R-TEST-1: deleting from the card confirms, deletes by id, and opens the list",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Delete task" }));
    const dialog = await page().findByRole("alertdialog", { name: "Delete “Write report”?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));

    await waitFor(() => expect(page().queryByRole("alertdialog")).toBeNull());
    await expect(args.onDelete).toHaveBeenCalledOnce();
    await expect(args.onDelete).toHaveBeenCalledWith({ id: TASK.id });
    await expect(getRouter().replace).toHaveBeenCalledWith(`/lists/${LIST_ID}`);
    const notifications = await page().findByRole("region", { name: /Notifications/ });
    const toast = await within(notifications).findByText("Deleted “Write report”");
    await waitFor(() => expect(toast).toBeVisible());
  },
};

export const OverdueOnUtcFallback: Story = {
  name: "An overdue task on the UTC fallback names the zone",
  args: {
    task: { ...TASK, status: "new", deadline: new Date("2026-10-21T09:00:00Z") },
    deadlineInfo: { kind: "overdue", deltaMs: -2 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000 },
    timeZone: "UTC",
    showTimeZone: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("2 days overdue")).toBeVisible();
    await expect(canvas.getByRole("img", { name: "Overdue" })).toBeVisible();
    await expect(canvas.getByText("Tue 20 Oct, 08:30 UTC")).toBeVisible();
  },
};

export const Dark: Story = {
  name: "R-THEME-1, R-EVAL-4: done task card in the dark theme",
  globals: { theme: "dark" },
  args: { task: { ...TASK, status: "done" }, deadlineInfo: { kind: "done", deltaMs: 29 * 60 * 60 * 1000 } },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("combobox", { name: "Status" })).toHaveTextContent("Done");
    const header = canvas.getByRole("heading", { level: 1 }).parentElement;
    if (header === null) throw new Error("the headline has no container");
    await expect(within(header).getByText("Done")).toBeVisible();
  },
};
