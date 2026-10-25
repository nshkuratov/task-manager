import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

const meta = {
  title: "Common/EmptyState",
  component: EmptyState,
  args: {
    title: "No lists yet",
    description: "Create a list to start tracking tasks.",
    action: <Button size="pill">New list</Button>,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "No lists yet" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "New list" })).toBeVisible();
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByRole("heading", { name: "No lists yet" })).toBeVisible();
  },
};
