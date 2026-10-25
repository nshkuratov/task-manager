import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { startTransition, useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import type { ActionResult } from "@/contracts";
import { sortTasks } from "@/domain";
import { TaskTable, type TaskRowData, type TaskTableProps } from "./task-table";

const NOW = new Date("2026-10-22T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR);
const task = (fields: Omit<TaskRowData, "id">): TaskRowData => ({ id: crypto.randomUUID(), ...fields });

const UNSORTED: TaskRowData[] = [
  task({ title: "Set up the status page", status: "done", priority: "medium", deadline: at(-72) }),
  task({ title: "Write the launch blog post", status: "in_progress", priority: "medium", deadline: at(24 * 7) }),
  task({ title: "Prepare the press kit", status: "new", priority: "low", deadline: at(30) }),
  task({ title: "Pick a launch date", status: "new", priority: "high", deadline: null }),
  task({ title: "Finalize pricing page copy", status: "in_progress", priority: "high", deadline: at(-24) }),
  task({ title: "Brief the support team", status: "new", priority: "high", deadline: at(30) }),
];
const SORTED = sortTasks(UNSORTED, NOW);
const EXPECTED_ORDER = [
  "Finalize pricing page copy",
  "Brief the support team",
  "Prepare the press kit",
  "Write the launch blog post",
  "Pick a launch date",
  "Set up the status page",
];
const LONG_TITLE =
  "Coordinate the final international launch readiness review with every regional operations team and stakeholder";

const ok = <T,>(data: T): Promise<ActionResult<T>> => Promise.resolve({ ok: true, data });

/** Plays the server's part: a successful action changes the rows, as the revalidated page would. */
function Revalidating(args: TaskTableProps) {
  const [tasks, setTasks] = useState(args.tasks);
  return (
    <TaskTable
      {...args}
      tasks={tasks}
      setTaskStatus={async (input) => {
        const result = await args.setTaskStatus(input);
        if (result.ok) {
          startTransition(() => {
            setTasks((rows) =>
              sortTasks(
                rows.map((row) => (row.id === input.id ? { ...row, status: input.status } : row)),
                NOW,
              ),
            );
          });
        }
        return result;
      }}
      deleteTask={async (input) => {
        const result = await args.deleteTask(input);
        if (result.ok) {
          startTransition(() => {
            setTasks((rows) => rows.filter((row) => row.id !== input.id));
          });
        }
        return result;
      }}
    />
  );
}

const meta = {
  title: "ListTasks/TaskTable",
  component: TaskTable,
  args: {
    tasks: SORTED,
    listName: "Product launch",
    now: NOW,
    timeZone: "Europe/Amsterdam",
    setTaskStatus: fn<TaskTableProps["setTaskStatus"]>(() => ok(undefined)),
    deleteTask: fn<TaskTableProps["deleteTask"]>(() => ok({ listId: crypto.randomUUID() })),
    empty: <p>No tasks yet</p>,
  },
  render: (args) => <Revalidating {...args} />,
  decorators: [
    (Story, { globals }) => (
      <>
        <Story />
        <Toaster theme={globals.theme === "dark" ? "dark" : "light"} />
      </>
    ),
  ],
} satisfies Meta<typeof TaskTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);
const rowTitles = (canvasElement: HTMLElement) =>
  within(canvasElement)
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getByRole("link").textContent);
const idOf = (title: string) => {
  const found = SORTED.find((row) => row.title === title);
  if (found === undefined) throw new Error(`fixture has no task "${title}"`);
  return found.id;
};

export const Sorted: Story = {
  name: "R-SORT-1, R-SORT-2, R-SORT-3, R-SORT-4, R-TASKS-1, R-TEST-1: overdue first, nearer deadlines, priority ties, done last",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole("table", { name: "Tasks in Product launch, sorted by urgency" });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    await expect(headers).toEqual(["Title", "Status", "Priority", "Deadline", "Actions"]);
    await expect(rowTitles(canvasElement)).toEqual(EXPECTED_ORDER);

    const overdueRow = canvas.getByRole("row", { name: /Finalize pricing page copy/ });
    await expect(within(overdueRow).getByRole("img", { name: "Overdue" })).toBeVisible();
    await expect(within(overdueRow).getByText("1 day overdue")).toBeVisible();
    const undatedRow = canvas.getByRole("row", { name: /Pick a launch date/ });
    await expect(within(undatedRow).getByText("No deadline")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Brief the support team" })).toHaveAttribute(
      "href",
      `/tasks/${idOf("Brief the support team")}`,
    );
    await expect(canvas.getByRole("region", { name: "Tasks in Product launch" })).toHaveAttribute("tabindex", "0");
  },
};

export const LongTitle: Story = {
  name: "Long task titles stay inside the title column",
  args: {
    tasks: [task({ title: LONG_TITLE, status: "new", priority: "medium", deadline: null })],
  },
  play: async ({ canvasElement }) => {
    const title = within(canvasElement).getByRole("link", { name: LONG_TITLE });
    // Clipped inside its cell: the text is longer than the link's box, and the box ends within the cell.
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    const cell = title.closest("td");
    await expect(cell).not.toBeNull();
    await expect(title.getBoundingClientRect().right).toBeLessThanOrEqual(cell?.getBoundingClientRect().right ?? 0);
    await expect(title).toHaveAttribute("title", LONG_TITLE);
  },
};

async function chooseStatus(trigger: HTMLElement, label: string) {
  await userEvent.click(trigger);
  await userEvent.click(await page().findByRole("option", { name: label }));
  await waitFor(() => expect(page().queryByRole("listbox")).toBeNull());
  await waitFor(() => expect(trigger).not.toHaveAttribute("aria-hidden"));
}

export const ChangeStatus: Story = {
  name: "R-TASKS-5, R-TEST-1: changing a row's status calls the action with its id and status, then re-sorts",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await chooseStatus(canvas.getByRole("combobox", { name: "Status for Brief the support team" }), "Done");

    await expect(args.setTaskStatus).toHaveBeenCalledOnce();
    await expect(args.setTaskStatus).toHaveBeenCalledWith({ id: idOf("Brief the support team"), status: "done" });
    await waitFor(() => expect(rowTitles(canvasElement).at(-1)).toBe("Brief the support team"));
    const notifications = await page().findByRole("region", { name: /Notifications/ });
    await expect(await within(notifications).findByText("“Brief the support team” is now Done")).toBeInTheDocument();
  },
};

export const ChangeStatusFailure: Story = {
  name: "R-TASKS-5: a refused status change keeps the row as it was and claims no success",
  args: {
    setTaskStatus: fn<TaskTableProps["setTaskStatus"]>(() =>
      Promise.resolve({ ok: false, formError: "The server refused this change." }),
    ),
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("combobox", { name: "Status for Prepare the press kit" });
    await chooseStatus(trigger, "Done");

    const notifications = await page().findByRole("region", { name: /Notifications/ });
    await expect(await within(notifications).findByText("The server refused this change.")).toBeInTheDocument();
    await expect(within(notifications).queryByText("“Prepare the press kit” is now Done")).toBeNull();
    await waitFor(() => expect(trigger).toHaveTextContent("New"));
    await expect(rowTitles(canvasElement)).toEqual(EXPECTED_ORDER);
  },
};

async function openRowMenu(canvasElement: HTMLElement, title: string) {
  const trigger = within(canvasElement).getByRole("button", { name: `Actions for ${title}` });
  trigger.focus();
  await userEvent.keyboard("{Enter}");
  const menu = await page().findByRole("menu");
  return { trigger, menu };
}

export const DeleteRow: Story = {
  name: "R-TASKS-4, R-TEST-1: row menu → Delete → confirm deletes the row; focus moves to the next row",
  play: async ({ args, canvasElement }) => {
    const title = "Prepare the press kit";

    const first = await openRowMenu(canvasElement, title);
    await userEvent.click(within(first.menu).getByRole("menuitem", { name: "Delete" }));
    const cancelled = await page().findByRole("alertdialog", { name: `Delete “${title}”?` });
    await userEvent.click(within(cancelled).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(page().queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(first.trigger).toHaveFocus());
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe("none"));
    await expect(args.deleteTask).not.toHaveBeenCalled();

    const second = await openRowMenu(canvasElement, title);
    await userEvent.click(within(second.menu).getByRole("menuitem", { name: "Delete" }));
    const dialog = await page().findByRole("alertdialog", { name: `Delete “${title}”?` });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));

    await waitFor(() => expect(within(canvasElement).queryByRole("link", { name: title })).toBeNull());
    await expect(args.deleteTask).toHaveBeenCalledOnce();
    await expect(args.deleteTask).toHaveBeenCalledWith({ id: idOf(title) });
    await waitFor(() =>
      expect(within(canvasElement).getByRole("link", { name: "Write the launch blog post" })).toHaveFocus(),
    );
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe("none"));
  },
};

export const DeleteLastRow: Story = {
  name: "R-TASKS-4: deleting the only task shows the empty state and keeps focus on the page",
  args: { tasks: [task({ title: "Only task", status: "new", priority: "medium", deadline: null })] },
  play: async ({ canvasElement }) => {
    const { menu } = await openRowMenu(canvasElement, "Only task");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
    const dialog = await page().findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));

    const empty = await within(canvasElement).findByText("No tasks yet");
    await waitFor(() => expect(empty.parentElement).toHaveFocus());
  },
};

export const DeleteFailure: Story = {
  name: "R-TASKS-4: a failed delete keeps the row and the dialog, and says why",
  args: {
    deleteTask: fn<TaskTableProps["deleteTask"]>(() =>
      Promise.resolve({ ok: false, formError: "This task no longer exists." }),
    ),
  },
  play: async ({ canvasElement }) => {
    const { menu } = await openRowMenu(canvasElement, "Pick a launch date");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
    const dialog = await page().findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));

    const notifications = await page().findByRole("region", { name: /Notifications/ });
    await expect(await within(notifications).findByText("This task no longer exists.")).toBeInTheDocument();
    await expect(dialog).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page().queryByRole("alertdialog")).toBeNull());
    await expect(within(canvasElement).getByRole("link", { name: "Pick a launch date" })).toBeVisible();
  },
};

/** The empty state's own Add task trigger unmounts when the first row arrives, as on the real page. */
function FirstTask(args: TaskTableProps) {
  const [tasks, setTasks] = useState<readonly TaskRowData[]>([]);
  return (
    <TaskTable
      {...args}
      tasks={tasks}
      empty={
        <button
          type="button"
          onClick={() => {
            setTasks([task({ title: "First task", status: "new", priority: "medium", deadline: null })]);
          }}
        >
          Add task
        </button>
      }
    />
  );
}

export const AddFirstTask: Story = {
  name: "R-TASKS-2: after the first task arrives from the empty state, focus moves to its title",
  render: (args) => <FirstTask {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add task" }));
    const title = await canvas.findByRole("link", { name: "First task" });
    await waitFor(() => expect(title).toHaveFocus());
  },
};

export const EmptySlot: Story = {
  name: "With no rows, renders the empty slot instead of a table",
  args: { tasks: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("table")).toBeNull();
    await expect(canvas.getByText("No tasks yet")).toBeVisible();
  },
};

export const Dark: Story = {
  name: "Rows, overdue tint and the row menu in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(rowTitles(canvasElement)).toEqual(EXPECTED_ORDER);
    const { trigger } = await openRowMenu(canvasElement, "Pick a launch date");
    await expect(page().getByRole("menuitem", { name: "Edit" })).toHaveAttribute(
      "href",
      `/tasks/${idOf("Pick a launch date")}`,
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page().queryByRole("menu")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};
