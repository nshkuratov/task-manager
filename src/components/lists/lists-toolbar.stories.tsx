import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { ListsToolbar } from "./lists-toolbar";

const meta = {
  title: "Lists/ListsToolbar",
  component: ListsToolbar,
  args: { createList: fn(), onQueryChange: fn() },
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/lists" } } },
} satisfies Meta<typeof ListsToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "R-LIST-5, R-LIST-8: search and “New list” side by side",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("search")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "New list" })).toBeVisible();
    await userEvent.type(canvas.getByRole("searchbox", { name: "Search lists" }), "home");
    await waitFor(() => expect(args.onQueryChange).toHaveBeenCalledWith("home"));
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByRole("button", { name: "New list" })).toBeVisible();
  },
};
