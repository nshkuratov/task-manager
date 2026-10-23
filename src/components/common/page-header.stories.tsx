import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { PageHeader } from "./page-header";

const meta = {
  title: "Common/PageHeader",
  component: PageHeader,
  args: {
    title: "Your lists",
    description: "Every list with its progress and what is overdue.",
    actions: <Button>New list</Button>,
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("Your lists");
    await expect(canvas.getByRole("button", { name: "New list" })).toBeVisible();
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByRole("heading", { level: 1, name: "Your lists" })).toBeVisible();
  },
};
