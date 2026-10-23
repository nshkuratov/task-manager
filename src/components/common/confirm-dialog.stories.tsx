import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Component, type ReactNode } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./confirm-dialog";

const never = () => new Promise<void>(() => {});

const meta = {
  title: "Common/ConfirmDialog",
  component: ConfirmDialog,
  args: {
    title: "Delete “Groceries” and its 4 tasks?",
    description: "The list and every task in it will be removed. This can’t be undone.",
    confirmLabel: "Delete list",
    pendingLabel: "Deleting…",
    onConfirm: fn(),
    trigger: <Button variant="outline">Delete “Groceries”</Button>,
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

async function openDialog(canvasElement: HTMLElement) {
  const trigger = within(canvasElement).getByRole("button", { name: "Delete “Groceries”" });
  await userEvent.click(trigger);
  const dialog = await page().findByRole("alertdialog", { name: "Delete “Groceries” and its 4 tasks?" });
  await waitFor(() => expect(dialog).toBeVisible());
  return { trigger, dialog };
}

export const EscapeCancels: Story = {
  name: "Escape cancels and returns focus to the trigger",
  play: async ({ args, canvasElement }) => {
    const { trigger } = await openDialog(canvasElement);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page().queryByRole("alertdialog")).toBeNull());
    await expect(trigger).toHaveFocus();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

export const ConfirmShowsPending: Story = {
  name: "Confirm calls the action once and shows pending until it settles",
  args: { onConfirm: fn(never) },
  play: async ({ args, canvasElement }) => {
    const { dialog } = await openDialog(canvasElement);
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete list" }));
    const confirm = await within(dialog).findByRole("button", { name: "Deleting…" });
    await expect(confirm).toHaveAttribute("aria-disabled", "true");
    await expect(confirm).toHaveFocus();
    await expect(within(dialog).getByRole("status")).toHaveTextContent("Deleting…");
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    await userEvent.click(confirm);
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    await userEvent.keyboard("{Escape}");
    await expect(page().getByRole("alertdialog")).toBeInTheDocument();
  },
};

export const ClosesOnSuccess: Story = {
  name: "A settled action closes the dialog",
  args: { onConfirm: fn(async () => {}) },
  play: async ({ args, canvasElement }) => {
    const { dialog, trigger } = await openDialog(canvasElement);
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete list" }));
    await waitFor(() => expect(page().queryByRole("alertdialog")).toBeNull());
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

// Controlled mode: a close request surfaces as onOpenChange(false), which the spy records but never
// applies, so these assertions do not depend on Radix's exit animation timing.
const controlled = { trigger: undefined, open: true, onOpenChange: fn() };

export const StaysOpenOnFalse: Story = {
  name: "Returning false keeps the dialog open for a retry",
  args: { ...controlled, onConfirm: fn(() => false) },
  play: async ({ args }) => {
    const dialog = await page().findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete list" }));
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    const confirm = await within(dialog).findByRole("button", { name: "Delete list" });
    await expect(confirm).not.toHaveAttribute("aria-disabled");
    await expect(confirm).toHaveFocus();
    await expect(args.onOpenChange).not.toHaveBeenCalled();
  },
};

export const ControlledClosesOnSuccess: Story = {
  name: "Controlled: a settled action requests close once",
  args: { ...controlled, onConfirm: fn(async () => {}) },
  play: async ({ args }) => {
    const dialog = await page().findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete list" }));
    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledOnce());
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
  },
};

export const ControlledPendingBlocksClose: Story = {
  name: "Controlled: no close request while pending",
  args: { ...controlled, onConfirm: fn(never) },
  play: async ({ args }) => {
    const dialog = await page().findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete list" }));
    await within(dialog).findByRole("button", { name: "Deleting…" });
    await userEvent.keyboard("{Escape}");
    await expect(args.onOpenChange).not.toHaveBeenCalled();
  },
};

export const ControlledPendingClickKeepsOpen: Story = {
  name: "Controlled: a confirm click while pending is ignored and requests no close",
  args: { ...controlled, onConfirm: fn(never) },
  play: async ({ args }) => {
    const dialog = await page().findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete list" }));
    const confirm = await within(dialog).findByRole("button", { name: "Deleting…" });
    await expect(confirm).toHaveAttribute("aria-busy", "true");
    await userEvent.click(confirm);
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    await expect(args.onOpenChange).not.toHaveBeenCalled();
    await expect(page().getByRole("alertdialog")).toBeInTheDocument();
  },
};

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? <p role="alert">Something went wrong</p> : this.props.children;
  }
}

export const ThrowReachesErrorBoundary: Story = {
  name: "An unexpected throw reaches the error boundary",
  args: { onConfirm: fn(() => Promise.reject(new Error("Unexpected failure"))) },
  decorators: [
    (Story) => (
      <Boundary>
        <Story />
      </Boundary>
    ),
  ],
  play: async ({ canvasElement }) => {
    const { dialog } = await openDialog(canvasElement);
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete list" }));
    await expect(await within(canvasElement).findByRole("alert")).toHaveTextContent("Something went wrong");
  },
};

export const Dark: Story = {
  name: "Open in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    const { dialog } = await openDialog(canvasElement);
    await expect(within(dialog).getByRole("button", { name: "Delete list" })).toBeEnabled();
  },
};
