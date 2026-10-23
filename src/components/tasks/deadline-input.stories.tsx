import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { DeadlineInput, type DeadlineInputProps } from "./deadline-input";

function Controlled(args: DeadlineInputProps) {
  const [value, setValue] = useState(args.value);
  return (
    <DeadlineInput
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange(next);
      }}
    />
  );
}

const meta = {
  title: "Tasks/DeadlineInput",
  component: DeadlineInput,
  args: { value: null, timeZone: "Asia/Kolkata", onChange: fn() },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof DeadlineInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DateThenTime: Story = {
  name: "R-TASKS-2: a date means 23:59 in the given zone until a time is added",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("group", { name: "Deadline" })).toBeInTheDocument();
    const date = canvas.getByLabelText("Date");
    const time = canvas.getByLabelText("Time (optional)");
    await expect(time).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Clear deadline" })).toBeDisabled();

    await userEvent.type(date, "2026-10-24");
    await expect(args.onChange).toHaveBeenLastCalledWith("2026-10-24T23:59:00+05:30");
    await userEvent.type(time, "09:15");
    await expect(args.onChange).toHaveBeenLastCalledWith("2026-10-24T09:15:00+05:30");
  },
};

export const ClearDeadline: Story = {
  name: "R-TASKS-3: Clear removes both parts, emits no deadline and keeps focus in the group",
  args: { value: "2026-10-24T09:15:00+05:30" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const date = canvas.getByLabelText("Date");
    await expect(date).toHaveValue("2026-10-24");
    await expect(canvas.getByLabelText("Time (optional)")).toHaveValue("09:15");

    await userEvent.click(canvas.getByRole("button", { name: "Clear deadline" }));
    await expect(args.onChange).toHaveBeenLastCalledWith(null);
    await expect(date).toHaveValue("");
    await expect(canvas.getByLabelText("Time (optional)")).toHaveValue("");
    await expect(canvas.getByLabelText("Time (optional)")).toBeDisabled();
    await waitFor(() => expect(date).toHaveFocus());
  },
};

export const WithError: Story = {
  name: "An error is linked to the date input",
  args: { error: "Enter a valid deadline" },
  play: async ({ canvasElement }) => {
    const date = within(canvasElement).getByLabelText("Date");
    await expect(date).toHaveAttribute("aria-invalid", "true");
    await expect(date).toHaveAccessibleDescription(
      "Optional. Without a time, the deadline is 23:59. Enter a valid deadline",
    );
  },
};

export const Dark: Story = {
  name: "Filled in the dark theme",
  args: { value: "2026-10-24T09:15:00+05:30" },
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText("Date")).toHaveValue("2026-10-24");
    await expect(document.documentElement).toHaveClass("dark");
  },
};
