import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { startTransition, useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { TaskStatus } from "@/contracts";
import { StatusFilter, type StatusFilterProps } from "./status-filter";

const LIST_PATH = `/lists/${crypto.randomUUID()}`;

/** Plays the URL's part: the selection the page re-renders with after a change. */
function FromUrl(args: StatusFilterProps) {
  const [selected, setSelected] = useState<readonly TaskStatus[]>(args.selected);
  return (
    <StatusFilter
      {...args}
      selected={selected}
      onChange={(next) => {
        args.onChange?.(next);
        startTransition(() => {
          setSelected(next);
        });
      }}
    />
  );
}

const meta = {
  title: "ListTasks/StatusFilter",
  component: StatusFilter,
  args: {
    selected: [],
    counts: { new: 3, in_progress: 2, done: 1 },
    onChange: fn<NonNullable<StatusFilterProps["onChange"]>>(),
  },
  render: (args) => <FromUrl {...args} />,
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: LIST_PATH } } },
} satisfies Meta<typeof StatusFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

const toggle = (canvasElement: HTMLElement, name: RegExp) => within(canvasElement).getByRole("button", { name });

export const Toggle: Story = {
  name: "R-TASKS-6, R-TEST-1: pressing Done filters to done tasks; pressing it again shows all",
  play: async ({ args, canvasElement }) => {
    const done = toggle(canvasElement, /^Done 1$/);
    const all = toggle(canvasElement, /^All$/);
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(done).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(done);
    await expect(args.onChange).toHaveBeenLastCalledWith(["done"]);
    await waitFor(() => expect(done).toHaveAttribute("aria-pressed", "true"));
    await expect(all).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(done);
    await expect(args.onChange).toHaveBeenLastCalledWith([]);
    await waitFor(() => expect(done).toHaveAttribute("aria-pressed", "false"));
    await expect(all).toHaveAttribute("aria-pressed", "true");
  },
};

export const Several: Story = {
  name: "R-TASKS-6: several statuses combine in status order, and All clears them",
  play: async ({ args, canvasElement }) => {
    await userEvent.click(toggle(canvasElement, /^Done/));
    await userEvent.click(toggle(canvasElement, /^New/));
    await expect(args.onChange).toHaveBeenLastCalledWith(["new", "done"]);

    await userEvent.click(toggle(canvasElement, /^All$/));
    await expect(args.onChange).toHaveBeenLastCalledWith([]);
    await waitFor(() => expect(toggle(canvasElement, /^New/)).toHaveAttribute("aria-pressed", "false"));
  },
};

export const Navigates: Story = {
  name: "R-TASKS-6, R-DATA-3: without an override the choice goes to the URL, not to client state",
  args: { selected: ["new"] },
  render: ({ selected, counts }) => <StatusFilter selected={selected} counts={counts} />,
  play: async ({ canvasElement }) => {
    await expect(toggle(canvasElement, /^New/)).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(toggle(canvasElement, /^In progress/));
    await expect(getRouter().replace).toHaveBeenLastCalledWith(`${LIST_PATH}?status=new,in_progress`, {
      scroll: false,
    });
    await userEvent.click(toggle(canvasElement, /^All$/));
    await expect(getRouter().replace).toHaveBeenLastCalledWith(LIST_PATH, { scroll: false });
  },
};

export const Keyboard: Story = {
  name: "R-TASKS-6: operable by keyboard (Tab, arrows, Space)",
  play: async ({ args, canvasElement }) => {
    toggle(canvasElement, /^All$/).focus();
    await userEvent.tab();
    await expect(toggle(canvasElement, /^New/)).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(toggle(canvasElement, /^In progress/)).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(args.onChange).toHaveBeenLastCalledWith(["in_progress"]);
  },
};

export const Dark: Story = {
  name: "Pressed and unpressed states in the dark theme",
  globals: { theme: "dark" },
  args: { selected: ["in_progress"] },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(toggle(canvasElement, /^In progress 2$/)).toHaveAttribute("aria-pressed", "true");
  },
};
