import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import { expect, fn, userEvent, within } from "storybook/test";
import { AuthShell } from "./auth-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { LoginCard } from "./login-card";
import type { SignInAction } from "./login-form";
import { Loading as FormLoading, ServerError as FormServerError } from "./login-form.stories";

const STORAGE_KEY = "storybook-login-page-theme";

function SyncTheme({ theme }: { theme: string }) {
  const { setTheme } = useTheme();
  useEffect(() => setTheme(theme), [theme, setTheme]);
  return null;
}

const meta = {
  title: "Auth/LoginPage",
  component: LoginCard,
  args: { signIn: fn<SignInAction>(() => Promise.resolve(undefined)) },
  parameters: {
    layout: "fullscreen",
    themeDecorator: false,
    viewport: {
      options: {
        mobile: { name: "Mobile (375px)", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  decorators: [
    (Story, { globals }) => (
      <ThemeProvider storageKey={STORAGE_KEY} defaultTheme={globals.theme === "dark" ? "dark" : "light"}>
        <SyncTheme theme={globals.theme === "dark" ? "dark" : "light"} />
        <AuthShell>
          <Story />
        </AuthShell>
      </ThemeProvider>
    ),
  ],
  beforeEach: () => {
    localStorage.removeItem(STORAGE_KEY);
    return () => {
      localStorage.removeItem(STORAGE_KEY);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.style.removeProperty("color-scheme");
    };
  },
} satisfies Meta<typeof LoginCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = { globals: { theme: "light" } };
export const Dark: Story = { globals: { theme: "dark" } };
export const Mobile: Story = { globals: { viewport: { value: "mobile", isRotated: false } } };
export const MobileDark: Story = { globals: { theme: "dark", viewport: { value: "mobile", isRotated: false } } };

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    await document.fonts.ready;
    const canvas = within(canvasElement);
    const form = canvas.getByRole("button", { name: "Sign in" }).closest("form")!;
    const card = form.parentElement!;
    const before = card.getBoundingClientRect();
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(canvas.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email address");
    await expect(canvas.getByLabelText("Password")).toHaveAccessibleDescription("Enter your password");
    const after = card.getBoundingClientRect();
    await expect(after.height).toBe(before.height);
    await expect(after.top).toBe(before.top);
  },
};
export const DarkValidationErrors: Story = { ...ValidationErrors, globals: { theme: "dark" } };
export const Loading: Story = { ...FormLoading, name: "Signing in" };
export const ServerError: Story = { ...FormServerError, name: "Server error" };
