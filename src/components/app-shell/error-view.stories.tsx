import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ErrorView } from "./error-view";

const meta = {
  title: "AppShell/ErrorView",
  component: ErrorView,
  args: { onRetry: fn() },
} satisfies Meta<typeof ErrorView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Retry: Story = {
  name: "R-EVAL-4: Try again calls retry; Back to lists links home",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Back to lists" })).toHaveAttribute("href", "/lists");
    await expect(canvas.queryByText(/^Reference:/)).not.toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

export const RetryPending: Story = {
  name: "R-EVAL-4: while the retry re-fetches, Try again is busy, announced and ignores repeat clicks",
  args: { onRetry: fn(() => new Promise<never>(() => {})) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));

    const busy = await canvas.findByRole("button", { name: "Trying again…" });
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(busy).toHaveAttribute("aria-disabled", "true");
    await expect(canvas.getByRole("status")).toHaveTextContent("Trying again…");
    await userEvent.click(busy);
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

export const WithReference: Story = {
  name: "R-EVAL-4: a server error shows its reference digest",
  args: { digest: "1234567890" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Reference: 1234567890")).toBeVisible();
  },
};

export const Dark: Story = {
  name: "R-THEME-1, R-EVAL-4: error view in the dark theme",
  globals: { theme: "dark" },
  args: { digest: "1234567890" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByRole("button", { name: "Try again" })).toBeVisible();
  },
};
