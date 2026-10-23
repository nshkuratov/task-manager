import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import type { ListSummary } from "@/contracts";
import { ListHeader } from "./list-header";

const at = new Date("2026-10-01T09:00:00Z");
const summary = (counters: ListSummary["counters"], progress: number): ListSummary => ({
  list: { id: crypto.randomUUID(), name: "Product launch", createdAt: at, updatedAt: at },
  counters,
  progress,
  indicator: counters.overdue > 0 ? "overdue" : "none",
});

const meta = {
  title: "ListTasks/ListHeader",
  component: ListHeader,
  args: {
    summary: summary({ new: 2, inProgress: 1, done: 2, overdue: 1, total: 5 }, 2 / 5),
    actions: <Button>Add task</Button>,
  },
} satisfies Meta<typeof ListHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const countOf = (canvasElement: HTMLElement, label: string) => {
  const term = within(canvasElement).getByText(label, { selector: "dt" });
  return term.nextElementSibling?.textContent;
};

export const Default: Story = {
  name: "R-EVAL-4: the list name is the one headline, with its counters and progress",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("Product launch");
    const breadcrumb = canvas.getByRole("navigation", { name: "breadcrumb" });
    await expect(within(breadcrumb).getByRole("link", { name: "Lists" })).toHaveAttribute("href", "/lists");

    await expect(countOf(canvasElement, "New")).toBe("2");
    await expect(countOf(canvasElement, "In progress")).toBe("1");
    await expect(countOf(canvasElement, "Done")).toBe("2");
    await expect(countOf(canvasElement, "Overdue")).toBe("1");

    const progress = canvas.getByRole("progressbar", { name: "Progress of Product launch" });
    await expect(progress).toHaveAttribute("aria-valuenow", "40");
    await expect(progress).toHaveAttribute("aria-valuetext", "40% done (2 of 5)");
    await expect(canvas.getByText("40% done (2 of 5)")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Add task" })).toBeVisible();
    await expect(canvasElement.querySelector("p dl")).toBeNull();
  },
};

export const Floored: Story = {
  name: "Progress floors to a whole percent: 2 of 3 reads 66%, never 67%",
  args: { summary: summary({ new: 1, inProgress: 0, done: 2, overdue: 0, total: 3 }, 2 / 3) },
  play: async ({ canvasElement }) => {
    const progress = within(canvasElement).getByRole("progressbar");
    await expect(progress).toHaveAttribute("aria-valuetext", "66% done (2 of 3)");
  },
};

export const NoTasks: Story = {
  name: "An empty list reads 0% done (0 of 0), never NaN",
  args: { summary: summary({ new: 0, inProgress: 0, done: 0, overdue: 0, total: 0 }, 0), actions: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "0% done (0 of 0)");
    await expect(canvas.queryByText(/NaN/)).toBeNull();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const Dark: Story = {
  name: "Header with overdue counter in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByRole("heading", { level: 1, name: "Product launch" })).toBeVisible();
  },
};
