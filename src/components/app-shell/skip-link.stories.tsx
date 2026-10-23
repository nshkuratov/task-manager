import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MAIN_CONTENT_ID, SkipLink } from "./skip-link";

const meta = {
  title: "AppShell/SkipLink",
  component: SkipLink,
  decorators: [
    (Story) => (
      <>
        <Story />
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="p-4">
          <h1 className="text-lg font-semibold">Page content</h1>
        </main>
      </>
    ),
  ],
} satisfies Meta<typeof SkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

const widthOf = (element: Element) => element.getBoundingClientRect().width;

export const RevealsOnFocus: Story = {
  // Activation is not pressed here: in the test iframe an in-page link navigates the runner's page away. The
  // focus move to <main> is proven by the real-app run instead.
  name: "R-EVAL-4: the first Tab reveals the skip link, which targets a focusable main",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole("link", { name: "Skip to content" });
    await expect(widthOf(link)).toBeLessThanOrEqual(1);

    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.tab();
    await expect(link).toHaveFocus();
    await waitFor(() => expect(widthOf(link)).toBeGreaterThan(40));

    await expect(link).toHaveAttribute("href", `#${MAIN_CONTENT_ID}`);
    const main = canvas.getByRole("main");
    await expect(main).toHaveAttribute("id", MAIN_CONTENT_ID);
    await expect(main).toHaveAttribute("tabindex", "-1");

    main.focus();
    await expect(widthOf(link)).toBeLessThanOrEqual(1);
  },
};

export const Dark: Story = {
  name: "R-THEME-1, R-EVAL-4: skip link focused in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.tab();
    await expect(within(canvasElement).getByRole("link", { name: "Skip to content" })).toHaveFocus();
  },
};
