import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { TasksEmpty } from "./tasks-empty";

const LIST_PATH = `/lists/${crypto.randomUUID()}`;

const meta = {
  title: "ListTasks/TasksEmpty",
  component: TasksEmpty,
  args: { variant: "empty", action: <Button>Add task</Button> },
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: LIST_PATH } } },
} satisfies Meta<typeof TasksEmpty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: "R-TASKS-2: a list without tasks says so and offers Add task",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "No tasks yet" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Add task" })).toBeVisible();
  },
};

export const Filtered: Story = {
  name: "R-TASKS-6, R-TEST-1: a filter that hides everything names it, and Show all clears it",
  args: { variant: "filtered", statuses: ["done"], onShowAll: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "No tasks with status “Done”" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Show all" }));
    if (args.variant !== "filtered") throw new Error("story args: expected the filtered variant");
    await expect(args.onShowAll).toHaveBeenCalledOnce();
  },
};

export const FilteredNavigates: Story = {
  name: "R-TASKS-6: without an override, Show all drops the filter from the URL",
  args: { variant: "filtered", statuses: ["new", "in_progress"] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 2, name: "No tasks with status “New” or “In progress”" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Show all" }));
    await expect(getRouter().replace).toHaveBeenCalledWith(LIST_PATH, { scroll: false });
  },
};

export const Dark: Story = {
  name: "Both empty states in the dark theme",
  globals: { theme: "dark" },
  args: { variant: "filtered", statuses: ["done"], onShowAll: fn() },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByRole("button", { name: "Show all" })).toBeVisible();
  },
};
