import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Save", onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "Save" })).toBeDisabled();
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      {(["default", "destructive", "outline", "secondary", "ghost", "link"] as const).map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getAllByRole("button")).toHaveLength(6);
  },
};

export const ClickCallsHandler: Story = {
  name: "Click calls the handler",
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Save" });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
