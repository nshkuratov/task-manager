import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

const STORAGE_KEY = "storybook-theme-toggle";

function resetTheme() {
  localStorage.removeItem(STORAGE_KEY);
  const html = document.documentElement;
  html.classList.remove("light", "dark");
  html.style.removeProperty("color-scheme");
}

const meta = {
  title: "Theme/ThemeToggle",
  component: ThemeToggle,
  // next-themes owns the <html> class here; the preview decorator would fight it.
  parameters: { themeDecorator: false },
  decorators: [
    (Story, { globals }) => (
      <ThemeProvider storageKey={STORAGE_KEY} defaultTheme={globals.theme === "dark" ? "dark" : "light"}>
        <Story />
      </ThemeProvider>
    ),
  ],
  beforeEach: () => {
    resetTheme();
    return resetTheme;
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

export const KeyboardSelectsDark: Story = {
  name: "R-THEME-1: keyboard only — Enter opens, arrows move, Enter selects Dark",
  play: async ({ canvasElement }) => {
    const trigger = await within(canvasElement).findByRole("button", { name: "Change theme (current: Light)" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(page().getByRole("menuitemradio", { name: "Light" })).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    await expect(page().getByRole("menuitemradio", { name: "Dark" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    await expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(trigger).toHaveAccessibleName("Change theme (current: Dark)");

    await userEvent.keyboard("{Enter}");
    await expect(await page().findByRole("menuitemradio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    await expect(page().getByRole("menuitemradio", { name: "Light" })).toHaveAttribute("aria-checked", "false");
  },
};

export const SystemFollowsOs: Story = {
  name: "R-THEME-1: System applies the OS colour scheme",
  play: async ({ canvasElement }) => {
    const expected = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const other = expected === "dark" ? "light" : "dark";
    const trigger = await within(canvasElement).findByRole("button", { name: /^Change theme/ });

    // Start from the opposite of the OS scheme so choosing System must visibly change the class.
    await userEvent.click(trigger);
    await userEvent.click(await page().findByRole("menuitemradio", { name: other === "dark" ? "Dark" : "Light" }));
    await waitFor(() => expect(document.documentElement).toHaveClass(other));

    await userEvent.click(trigger);
    await userEvent.click(await page().findByRole("menuitemradio", { name: "System" }));
    await waitFor(() => expect(document.documentElement).toHaveClass(expected));
    await expect(document.documentElement).not.toHaveClass(other);
    await expect(localStorage.getItem(STORAGE_KEY)).toBe("system");
  },
};

export const MenuOpen: Story = {
  name: "R-THEME-1: menu open marks the current choice",
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole("button", { name: /^Change theme/ }));
    await expect(await page().findByRole("menuitemradio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
  },
};

export const Dark: Story = {
  name: "R-THEME-1: dark theme, menu open",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    await userEvent.click(await within(canvasElement).findByRole("button", { name: "Change theme (current: Dark)" }));
    await expect(await page().findByRole("menuitemradio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
  },
};
