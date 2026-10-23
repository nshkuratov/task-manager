import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { SignOutAction } from "@/components/auth/sign-out-button";
import { AppHeader } from "./app-header";

const EMAIL = "admin@example.com";

const meta = {
  title: "AppShell/AppHeader",
  component: AppHeader,
  args: { email: EMAIL, signOut: fn<SignOutAction>(() => new Promise<never>(() => {})) },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

export const KeyboardMenuSignOut: Story = {
  name: "R-EVAL-4: keyboard opens the account menu, Escape restores focus, Sign out calls signOut",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("banner")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Task Manager" })).toHaveAttribute("href", "/lists");

    const trigger = canvas.getByRole("button", { name: `Account: ${EMAIL}` });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    trigger.focus();
    await userEvent.keyboard("{Enter}");

    const panel = await page().findByRole("dialog", { name: "Signed in as" });
    await expect(panel).toHaveTextContent(EMAIL);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const signOutButton = within(panel).getByRole("button", { name: "Sign out" });
    await waitFor(() => expect(signOutButton).toHaveFocus());

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page().queryByRole("dialog")).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
    await expect(args.signOut).not.toHaveBeenCalled();

    await userEvent.keyboard("{Enter}");
    const reopened = await page().findByRole("dialog", { name: "Signed in as" });
    await waitFor(() => expect(within(reopened).getByRole("button", { name: "Sign out" })).toHaveFocus());
    await userEvent.keyboard("{Enter}");

    // Not toBeVisible: the popover may still be in its fade-in frame, which reads as opacity 0.
    await expect(await within(reopened).findByRole("button", { name: "Signing out…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(args.signOut).toHaveBeenCalledOnce();
    await expect(args.signOut).toHaveBeenCalledWith({});
  },
};

export const ThemeToggleInHeader: Story = {
  name: "R-THEME-1: the theme toggle is reachable in the header",
  play: async ({ canvasElement }) => {
    const banner = within(within(canvasElement).getByRole("banner"));
    await expect(await banner.findByRole("button", { name: /^Change theme \(current: / })).toBeEnabled();
  },
};

export const Dark: Story = {
  name: "R-THEME-1, R-EVAL-4: header in the dark theme, account menu open",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await userEvent.click(within(canvasElement).getByRole("button", { name: `Account: ${EMAIL}` }));
    await expect(await page().findByRole("dialog", { name: "Signed in as" })).toHaveTextContent(EMAIL);
  },
};
