import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { NotFoundView } from "./not-found-view";

const meta = {
  title: "AppShell/NotFoundView",
  component: NotFoundView,
  decorators: [
    (Story) => (
      <main>
        <Story />
      </main>
    ),
  ],
} satisfies Meta<typeof NotFoundView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InsideShell: Story = {
  name: "R-EVAL-4: the 404 view adds no landmarks of its own and links back to the lists",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Go to your lists" })).toHaveAttribute("href", "/lists");
    await expect(canvas.getAllByRole("main")).toHaveLength(1);
    await expect(canvas.queryByRole("banner")).not.toBeInTheDocument();
  },
};

export const Dark: Story = {
  name: "R-THEME-1, R-EVAL-4: 404 view in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByRole("heading", { name: "Page not found" })).toBeVisible();
  },
};
