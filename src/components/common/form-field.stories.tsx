import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Input } from "@/components/ui/input";
import { FormField } from "./form-field";

const meta = {
  title: "Common/FormField",
  component: FormField,
  args: { label: "List name", description: "Up to 80 characters.", children: <Input /> },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithError: Story = {
  name: "Error is announced and linked to the control",
  args: { error: "Name is required" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "List name" });
    const error = canvas.getByRole("alert");
    await expect(error).toHaveTextContent("Name is required");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(error.id);
    await expect(input).toHaveAccessibleDescription("Up to 80 characters. Name is required");
  },
};

export const Valid: Story = {
  name: "Without an error the control is valid and described",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "List name" });
    await expect(input).not.toHaveAttribute("aria-invalid");
    await expect(input).toHaveAccessibleDescription("Up to 80 characters.");
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const CustomId: Story = {
  name: "A custom id keeps the label attached",
  args: { id: "list-name", description: undefined },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText("List name");
    await expect(input).toHaveAttribute("id", "list-name");
    await expect(input).not.toHaveAttribute("aria-describedby");
  },
};

export const Dark: Story = {
  name: "Error in the dark theme",
  args: { error: "Name is required" },
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(within(canvasElement).getByRole("textbox", { name: "List name" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};
