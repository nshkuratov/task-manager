import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { ListGrid } from "./list-grid";
import { ALL_SUMMARIES } from "./story-fixtures";

const meta = {
  title: "Lists/ListGrid",
  component: ListGrid,
  args: {
    summaries: ALL_SUMMARIES,
    renameList: fn(),
    deleteList: fn(),
    timeZone: "Europe/Amsterdam",
    showTimeZone: false,
  },
} satisfies Meta<typeof ListGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "R-LIST-1: a labelled list with one item per list, in the given order",
  play: async ({ canvasElement }) => {
    const items = within(within(canvasElement).getByRole("list", { name: "Lists" })).getAllByRole("listitem");
    await expect(items.map((item) => within(item).getByRole("heading", { level: 2 }).textContent)).toEqual([
      "Product launch",
      "Home renovation",
      "Reading list",
      "Someday",
    ]);
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByRole("list", { name: "Lists" })).toBeVisible();
  },
};
