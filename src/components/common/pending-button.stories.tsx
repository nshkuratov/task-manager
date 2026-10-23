import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { RotateCwIcon } from "lucide-react";
import type { FormEvent } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PendingButton } from "./pending-button";

const meta = {
  title: "Common/PendingButton",
  component: PendingButton,
  args: {
    type: "button",
    pending: false,
    pendingLabel: "Deleting…",
    children: "Delete list",
    onClick: fn(),
  },
} satisfies Meta<typeof PendingButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  name: "Idle: named by its label, operable, nothing announced",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Delete list" });
    await expect(button).not.toHaveAttribute("aria-disabled");
    await expect(button).not.toHaveAttribute("aria-busy");
    await expect(canvas.getByRole("status")).toHaveTextContent("");
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Pending: Story = {
  name: "Pending: inert but focusable, shows and announces the verb, ignores clicks",
  args: { pending: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Deleting…" });
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button).toBeEnabled();
    await expect(canvas.getByRole("status")).toHaveTextContent("Deleting…");
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(button).toHaveFocus();
  },
};

export const PendingReplacesIdleIcon: Story = {
  name: "Pending replaces the idle icon with the spinner",
  args: { pending: true, idleIcon: <RotateCwIcon aria-hidden />, children: "Try again", pendingLabel: "Trying again…" },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Trying again…" });
    const icons = button.querySelectorAll("svg");
    await expect(icons).toHaveLength(1);
    await expect(icons[0]).toHaveClass("animate-spin");
  },
};

export const CallerAriaDisabled: Story = {
  name: "A caller's aria-disabled stays set while idle",
  args: { "aria-disabled": true },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Delete list" });
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).not.toHaveAttribute("aria-busy");
  },
};

export const CallerFalseWhilePending: Story = {
  name: 'Pending wins over a caller\'s aria-disabled="false"',
  args: { "aria-disabled": "false", pending: true },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Deleting…" });
    await expect(button).toHaveAttribute("aria-disabled", "true");
  },
};

const onFormSubmit = fn((event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
});

const inForm: Decorator = (Story) => (
  <form aria-label="Task" onSubmit={onFormSubmit}>
    <input aria-label="Title" defaultValue="Buy milk" />
    <Story />
  </form>
);

const resetSubmitSpy = () => {
  onFormSubmit.mockClear();
};

export const SubmitBlockedWhilePending: Story = {
  name: "A pending submit button does not submit its form, by click or Enter",
  args: { type: "submit", pending: true, pendingLabel: "Saving…", children: "Save" },
  decorators: [inForm],
  beforeEach: resetSubmitSpy,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Saving…" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Title" }), "{Enter}");
    await expect(onFormSubmit).not.toHaveBeenCalled();
  },
};

export const SubmitWhileIdle: Story = {
  name: "An idle submit button submits its form",
  args: { type: "submit", pendingLabel: "Saving…", children: "Save" },
  decorators: [inForm],
  beforeEach: resetSubmitSpy,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Save" }));
    await expect(onFormSubmit).toHaveBeenCalledOnce();
  },
};

export const Dark: Story = {
  name: "Pending in the dark theme",
  args: { pending: true, variant: "destructive" },
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByRole("button", { name: "Deleting…" })).toHaveAttribute("aria-busy", "true");
  },
};
