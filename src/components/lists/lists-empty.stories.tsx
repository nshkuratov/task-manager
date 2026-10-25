import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { ListsEmpty } from "./lists-empty";

const meta = {
  title: "Lists/ListsEmpty",
  component: ListsEmpty,
  args: { kind: "no-lists", action: <Button className="h-10 rounded-full px-5">New list</Button> },
} satisfies Meta<typeof ListsEmpty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoLists: Story = {
  name: "No lists yet: an invitation and the create action",
  args: { kind: "no-lists", action: <Button className="h-10 rounded-full px-5">New list</Button> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "Create your first list" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "New list" })).toBeVisible();
  },
};

export const NoMatches: Story = {
  name: "R-LIST-8: no matches names the query and links back to every list",
  args: { kind: "no-matches", query: "groc" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "No lists match “groc”" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Clear search" })).toHaveAttribute("href", "/lists");
  },
};

export const Dark: Story = {
  name: "No matches in the dark theme",
  args: { kind: "no-matches", query: "groc" },
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByRole("link", { name: "Clear search" })).toBeVisible();
  },
};
