import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { SignOutButton, type SignOutAction } from "./sign-out-button";

const meta = {
  title: "Auth/SignOutButton",
  component: SignOutButton,
  args: { signOut: fn<SignOutAction>(() => new Promise<never>(() => {})) },
} satisfies Meta<typeof SignOutButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  name: "Signing out calls signOut once and shows pending",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Sign out" }));

    const busy = await canvas.findByRole("button", { name: "Signing out…" });
    await expect(busy).toHaveAttribute("aria-disabled", "true");
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(canvas.getByRole("status")).toHaveTextContent("Signing out…");
    await userEvent.click(busy);
    await expect(args.signOut).toHaveBeenCalledOnce();
    await expect(args.signOut).toHaveBeenCalledWith({});
  },
};

export const Dark: Story = {
  name: "Sign out in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(document.documentElement).toHaveClass("dark");
  },
};
